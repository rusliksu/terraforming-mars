import {expect} from 'chai';

import {InputResponse} from '../../../src/common/inputs/InputResponse';
import {CardName} from '../../../src/common/cards/CardName';
import {Phase} from '../../../src/common/Phase';
import {Game} from '../../../src/server/Game';
import {
  prepareActionReplayEntry,
  recordAcceptedActionReplayEntry,
  stepBackActionInput,
} from '../../../src/server/game/ActionReplay';
import {ArcticAlgae} from '../../../src/server/cards/base/ArcticAlgae';
import {BiomassCombustors} from '../../../src/server/cards/base/BiomassCombustors';
import {Comet} from '../../../src/server/cards/base/Comet';
import {ProjectEden} from '../../../src/server/cards/prelude2/ProjectEden';
import {HiTechLab} from '../../../src/server/cards/promo/HiTechLab';
import {testGame} from '../../TestGame';
import {hasRevealedHiddenInformation} from '../../../src/server/game/hasRevealedHiddenInformation';

describe('ActionReplay', () => {
  it('starts a fresh journal after an earlier prompt could not be replayed', () => {
    const [rawGame, player, otherPlayer] = testGame(2, {skipInitialCardSelection: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.activePlayer = player;
    player.preludeCardsInHand.push(new ProjectEden());
    player.cardsInHand.push(new ArcticAlgae(), new BiomassCombustors(), new Comet());
    player.takeAction(false);

    const input: InputResponse = {type: 'card', cards: [CardName.PROJECT_EDEN]};
    expect(prepareActionReplayEntry(game, player.id, input)).not.eq(undefined);
    expect(prepareActionReplayEntry(game, otherPlayer.id, {type: 'option'})).eq(undefined);
    expect(game.actionReplayState).eq(null);

    expect(prepareActionReplayEntry(game, player.id, input)).not.eq(undefined);
    expect(game.actionReplayState).not.eq(null);
  });

  it('returns Project Eden to its effect-choice screen without undoing the prelude', () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.activePlayer = player;
    player.preludeCardsInHand.push(new ProjectEden());
    player.cardsInHand.push(new ArcticAlgae(), new BiomassCombustors(), new Comet());
    player.takeAction(false);

    const rootPrompt = player.getWaitingFor()?.toModel(player);
    const rootSnapshot = game.serialize();
    const restoredRoot = Game.deserialize(rootSnapshot, {simulation: true});
    const restoredRootPlayer = restoredRoot.getPlayerById(player.id);
    expect(restoredRootPlayer.getWaitingFor()?.toModel(restoredRootPlayer)).deep.eq(rootPrompt);
    const accept = (input: InputResponse) => {
      const entry = prepareActionReplayEntry(game, player.id, input);
      expect(entry).not.eq(undefined);
      player.process(input);
      recordAcceptedActionReplayEntry(game, entry!);
    };

    accept({type: 'card', cards: [CardName.PROJECT_EDEN]});

    const choosePart = player.getWaitingFor()?.toModel(player);
    expect(choosePart?.type).eq('or');
    const cityIndex = choosePart?.type === 'or' ?
      choosePart.options.findIndex((option) => option.title === 'Place a city') : -1;
    expect(cityIndex).gte(0);
    accept({type: 'or', index: cityIndex, response: {type: 'option'}});

    const cityPrompt = player.getWaitingFor()?.toModel(player);
    expect(cityPrompt?.type).eq('space');
    if (cityPrompt?.type !== 'space') {
      throw new Error('Expected city placement prompt');
    }
    accept({type: 'space', spaceId: cityPrompt.spaces[0]});
    expect(game.board.spaces.some((space) => space.player?.id === player.id)).is.true;

    const expectedCurrentFingerprint = game.actionReplayState?.currentPromptFingerprint;
    expect(expectedCurrentFingerprint).not.eq(undefined);
    game.actionReplayState!.currentPromptFingerprint = 'stale-prompt';
    expect(() => stepBackActionInput(game, player.id)).to.throw('no longer matches');
    expect(game.board.spaces.some((space) => space.player?.id === player.id)).is.true;
    game.actionReplayState!.currentPromptFingerprint = expectedCurrentFingerprint!;

    const replayed = stepBackActionInput(game, player.id);
    const replayedPlayer = replayed.getPlayerById(player.id);
    const replayedPrompt = replayedPlayer.getWaitingFor()?.toModel(replayedPlayer);

    expect(replayedPrompt?.type).eq('or');
    if (replayedPrompt?.type !== 'or') {
      throw new Error('Expected Project Eden effect-choice prompt');
    }
    expect(replayedPrompt.options.map((option) => option.title)).to.include('Place a city');
    expect(replayedPlayer.playedCards.has(CardName.PROJECT_EDEN)).is.true;
    expect(replayed.board.spaces.some((space) => space.player?.id === player.id)).is.false;
    expect(replayed.simulationMode).is.false;
    expect(replayed.actionReplayState?.entries).length(1);
  });

  it('returns Hi-Tech Lab to the same revealed-card choice after a card was selected', () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoOption: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.simulationMode = true;
    game.activePlayer = player;
    player.energy = 3;
    player.playedCards.push(new HiTechLab());
    player.takeAction(false);

    const accept = (input: InputResponse) => {
      const entry = prepareActionReplayEntry(game, player.id, input);
      expect(entry).not.eq(undefined);
      player.process(input);
      recordAcceptedActionReplayEntry(game, entry!);
    };

    const rootPrompt = player.getWaitingFor()?.toModel(player);
    const actionCardIndex = rootPrompt?.type === 'or' ?
      rootPrompt.options.findIndex((option) => option.title === 'Perform an action from a played card') : -1;
    expect(actionCardIndex).gte(0);
    accept({
      type: 'or',
      index: actionCardIndex,
      response: {type: 'card', cards: [CardName.HI_TECH_LAB]},
    });
    accept({type: 'amount', amount: 3});

    const revealedPrompt = player.getWaitingFor()?.toModel(player);
    if (revealedPrompt?.type !== 'card') {
      throw new Error('Expected revealed-card choice');
    }
    const revealedCards = revealedPrompt.cards.map((card) => card.name);
    const selectedCard = revealedCards[0];
    accept({type: 'card', cards: [selectedCard]});
    expect(player.cardsInHand.some((card) => card.name === selectedCard)).is.true;

    const replayed = stepBackActionInput(game, player.id);
    const replayedPlayer = replayed.getPlayerById(player.id);
    const replayedPrompt = replayedPlayer.getWaitingFor()?.toModel(replayedPlayer);

    expect(replayedPrompt?.type).eq('card');
    if (replayedPrompt?.type !== 'card') {
      throw new Error('Expected replayed card choice');
    }
    expect(replayedPrompt.cards.map((card) => card.name)).deep.eq(revealedCards);
    expect(replayedPlayer.cardsInHand.some((card) => card.name === selectedCard)).is.false;
    expect(replayedPlayer.energy).eq(0);
    expect(hasRevealedHiddenInformation(game, replayed, player, {
      restoredPromptCardsAreKnown: true,
    })).is.false;

    const beforeReveal = stepBackActionInput(replayed, player.id);
    expect(beforeReveal.getPlayerById(player.id).getWaitingFor()?.toModel(beforeReveal.getPlayerById(player.id)).type)
      .eq('amount');
    expect(hasRevealedHiddenInformation(replayed, beforeReveal, replayedPlayer, {
      restoredPromptCardsAreKnown: true,
    })).is.true;
  });
});
