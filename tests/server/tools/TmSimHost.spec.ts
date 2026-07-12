import {expect} from 'chai';

import {Phase} from '../../../src/common/Phase';
import {CardName} from '../../../src/common/cards/CardName';
import {InputResponse} from '../../../src/common/inputs/InputResponse';
import {Birds} from '../../../src/server/cards/base/Birds';
import {DustSeals} from '../../../src/server/cards/base/DustSeals';
import {CrediCor} from '../../../src/server/cards/corporation/CrediCor';
import {AlliedBanks} from '../../../src/server/cards/prelude/AlliedBanks';
import {Game} from '../../../src/server/Game';
import {Server} from '../../../src/server/models/ServerModel';
import {
  ForkBatchV1,
  TmSimHost,
  assertSimulationEnvironmentSafe,
  cardIndexReplayInputV1,
  promptFingerprintFromWaitingFor,
  redeterminizeSnapshotForObserver,
  sanitizeSnapshotForSimulation,
} from '../../../src/server/tools/tm-sim-host';
import {testGame} from '../../TestingUtils';

function findOptionIndex(waitingFor: unknown, pattern: RegExp): number {
  const options = (waitingFor as {options?: Array<unknown>})?.options ?? [];
  return options.findIndex((option) => pattern.test(JSON.stringify(option)));
}

describe('TmSimHost', () => {
  it('maps an evidence card index to the current fair prompt', () => {
    expect(cardIndexReplayInputV1({
      type: 'card', cards: [{name: 'Alpha'}, {name: 'Beta'}, {name: 'Gamma'}],
    }, 1, 1)).deep.eq({type: 'card', cards: ['Beta']});
    expect(cardIndexReplayInputV1({type: 'card', cards: [{name: 'Alpha'}]}, 2, 1)).eq(null);
    expect(cardIndexReplayInputV1({type: 'or', cards: [{name: 'Alpha'}]}, 0, 1)).eq(null);
  });

  it('refuses an environment that could reach persistence or Telegram', () => {
    expect(() => assertSimulationEnvironmentSafe({POSTGRES_HOST: 'db'}))
      .to.throw('POSTGRES_HOST');
    expect(() => assertSimulationEnvironmentSafe({TM_BOT_TOKEN: 'configured'}))
      .to.throw('TM_BOT_TOKEN');
    expect(() => assertSimulationEnvironmentSafe({})).not.to.throw();
  });

  it('removes Telegram delivery state from a simulation snapshot', () => {
    const [rawGame, blue] = testGame(2, {skipInitialCardSelection: true});
    const game = rawGame as Game;
    blue.telegramID = 'private-chat-id';
    blue.lastNoticeMessageId = 123;
    const sanitized = sanitizeSnapshotForSimulation(game.serialize());
    expect(sanitized.players[0].telegramID).eq(undefined);
    expect(sanitized.players[0].lastNoticeMessageId).eq(-1);
  });

  it('forks a root action, regenerates the second prompt, and continues from a branch handle', () => {
    const [rawGame, blue, red] = testGame(2, {
      fastModeOption: true,
      skipInitialCardSelection: true,
    });
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.activePlayer = blue;
    blue.megaCredits = 0;
    blue.cardsInHand.push(new Birds());
    blue.takeAction(false);

    const rootObserver = Server.getPlayerModel(blue);
    const sellIndex = findOptionIndex(rootObserver.waitingFor, /sell patents/i);
    expect(sellIndex).gte(0, JSON.stringify(rootObserver.waitingFor));
    const rootFingerprint = promptFingerprintFromWaitingFor(rootObserver.waitingFor);
    const sellInput = {
      type: 'or',
      index: sellIndex,
      response: {type: 'card', cards: ['Birds']},
    } as InputResponse;

    const host = new TmSimHost(() => 1000, 60_000);
    const request: ForkBatchV1 = {
      kind: 'fork_batch_v1',
      requestId: 'fork-1',
      stateVersion: 'state-1',
      promptFingerprint: rootFingerprint,
      knowledgeMode: 'oracle_teacher',
      observerId: blue.id,
      actorId: blue.id,
      snapshot: game.serialize(),
      includeSimulationActor: true,
      includeRootObserver: true,
      branches: [{candidateId: 'sell-one', input: sellInput}],
    };
    const fork = host.handle(request);
    expect(fork.branches).length(1);
    const sell = fork.branches[0];
    expect(sell.status).eq('ok', sell.error);
    expect(sell.durationMs).gte(0);
    expect(sell.stableMainActionBoundary).eq(true, JSON.stringify(sell.warnings));
    expect(sell.branchHandle).not.eq(null);
    expect(sell.activePlayerId).eq(blue.id);
    expect((sell.simulationActor as ReturnType<typeof Server.getPlayerModel>).thisPlayer.color).eq(blue.color);
    expect((sell.rootObserver as ReturnType<typeof Server.getPlayerModel>).thisPlayer.megacredits).eq(0);
    expect(sell.promptFingerprint).not.eq(rootFingerprint);
    const sellObserver = sell.observer as ReturnType<typeof Server.getPlayerModel>;
    expect(sellObserver.thisPlayer.megacredits).eq(1);
    expect(sellObserver.cardsInHand).length(0);
    expect(JSON.stringify(sellObserver.waitingFor).toLowerCase()).contains('action');

    const passIndex = findOptionIndex(sellObserver.waitingFor, /pass/i);
    expect(passIndex).gte(0, JSON.stringify(sellObserver.waitingFor));
    const replayed = host.handle({
      ...request,
      requestId: 'fork-with-replay-continuation',
      branches: [{
        candidateId: 'sell-then-pass',
        input: sellInput,
        replayContinuations: [{
          actorId: blue.id,
          promptFingerprint: sell.promptFingerprint!,
          input: {type: 'or', index: passIndex, response: {type: 'option'}} as InputResponse,
        }],
      }],
    });
    expect(replayed.branches[0].status).eq('ok', replayed.branches[0].error);
    expect(replayed.branches[0].activePlayerId).eq(red.id);
    expect(replayed.branches[0].stableMainActionBoundary).eq(true);

    const rejectedCardIndex = host.handle({
      ...request,
      requestId: 'fork-with-card-index-on-wrong-prompt',
      branches: [{
        candidateId: 'reject-card-index-on-action-prompt',
        input: sellInput,
        replayContinuations: [{
          actorId: blue.id,
          promptType: 'card',
          cardSelectionIndex: 0,
          cardSelectionCount: 1,
        }],
      }],
    });
    expect(rejectedCardIndex.branches[0].status).eq('unsupported');
    expect(rejectedCardIndex.branches[0].warnings).deep.eq(['card_index_replay_not_legal']);

    const staleContinuation = host.handle({
      kind: 'continue_batch_v1',
      requestId: 'continue-stale',
      stateVersion: 'stale-state',
      knowledgeMode: 'oracle_teacher',
      observerId: blue.id,
      actorId: blue.id,
      includeSimulationActor: true,
      branches: [{
        candidateId: 'stale-pass',
        branchHandle: sell.branchHandle!,
        promptFingerprint: sell.promptFingerprint!,
        input: {
          type: 'or',
          index: passIndex,
          response: {type: 'option'},
        } as InputResponse,
      }],
    });
    expect(staleContinuation.branches[0].status).eq('stale');
    expect(staleContinuation.branches[0].warnings).deep.eq(['branch_handle_state_version_mismatch']);

    const continuation = host.handle({
      kind: 'continue_batch_v1',
      requestId: 'continue-1',
      stateVersion: sell.successorStateVersion!,
      knowledgeMode: 'oracle_teacher',
      observerId: blue.id,
      actorId: blue.id,
      includeSimulationActor: true,
      branches: [{
        candidateId: 'pass-after-sell',
        branchHandle: sell.branchHandle!,
        promptFingerprint: sell.promptFingerprint!,
        input: {
          type: 'or',
          index: passIndex,
          response: {type: 'option'},
        } as InputResponse,
      }],
    });
    const pass = continuation.branches[0];
    expect(pass.status).eq('ok', pass.error);
    expect(pass.activePlayerId).eq(red.id);
    expect((pass.simulationActor as ReturnType<typeof Server.getPlayerModel>).thisPlayer.color).eq(red.color);
    expect(pass.stableMainActionBoundary).eq(true, JSON.stringify(pass.warnings));
    const passObserver = pass.observer as ReturnType<typeof Server.getPlayerModel>;
    expect(passObserver.game.passedPlayers).contains(blue.color);
  });

  it('redeterminizes fair hidden allocation before forking', () => {
    const [rawGame, blue, red] = testGame(2, {fastModeOption: true, skipInitialCardSelection: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.activePlayer = blue;
    blue.cardsInHand.push(new Birds());
    red.cardsInHand.push(new DustSeals());
    // Real serialized ACTION games retain obsolete opening option containers.
    // Fair simulation must discard them instead of rejecting the snapshot.
    red.dealtCorporationCards.push(new CrediCor());
    red.dealtPreludeCards.push(new AlliedBanks());
    blue.takeAction(false);
    const rootObserver = Server.getPlayerModel(blue);
    const sellIndex = findOptionIndex(rootObserver.waitingFor, /sell patents/i);
    const snapshotA = game.serialize();
    snapshotA.players.find((player) => player.id === blue.id)!.dealtCorporationCards
      .push(CardName.THARSIS_REPUBLIC);
    const snapshotB = JSON.parse(JSON.stringify(snapshotA)) as typeof snapshotA;
    const redB = snapshotB.players.find((player) => player.id === red.id)!;
    const realOpponentCard = redB.cardsInHand[0];
    const realDeckCard = snapshotB.projectDeck.drawPile[0];
    redB.cardsInHand[0] = realDeckCard;
    snapshotB.projectDeck.drawPile[0] = realOpponentCard;

    const fairA = redeterminizeSnapshotForObserver(snapshotA, blue.id, 4242);
    const fairB = redeterminizeSnapshotForObserver(snapshotB, blue.id, 4242);
    expect(fairA.players.find((player) => player.id === red.id)!.cardsInHand)
      .deep.eq(fairB.players.find((player) => player.id === red.id)!.cardsInHand);
    expect(fairA.projectDeck.drawPile).deep.eq(fairB.projectDeck.drawPile);
    expect(fairA.players.find((player) => player.id === blue.id)!.cardsInHand).deep.eq(['Birds']);
    expect(fairA.players.find((player) => player.id === blue.id)!.dealtCorporationCards)
      .contains('Tharsis Republic');
    expect(fairA.players.find((player) => player.id === red.id)!.dealtCorporationCards).deep.eq([]);

    const result = new TmSimHost().handle({
      kind: 'fork_batch_v1',
      requestId: 'fair-fork',
      stateVersion: 'state',
      promptFingerprint: promptFingerprintFromWaitingFor(rootObserver.waitingFor),
      knowledgeMode: 'fair_live',
      observerId: blue.id,
      actorId: blue.id,
      snapshot: snapshotA,
      branches: [{
        candidateId: 'sell-one-fair',
        beliefSeed: 4242,
        input: {
          type: 'or',
          index: sellIndex,
          response: {type: 'card', cards: ['Birds']},
        } as InputResponse,
      }],
    });
    expect(result.branches[0].status).eq('ok', result.branches[0].error);
    expect(result.branches[0].simulationActor).eq(null);
    expect(result.branches[0].rootObserver).eq(null);
    expect(result.branches[0].branchHandle).not.eq(null);
    expect(JSON.stringify(result.branches[0].observer)).not.contains('Dust Seals');
  });
});
