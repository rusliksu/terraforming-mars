import {expect} from 'chai';
import {Phase} from '../../src/common/Phase';
import {cast} from '../../src/common/utils/utils';
import {SelectCard} from '../../src/server/inputs/SelectCard';
import {Server} from '../../src/server/models/ServerModel';
import {PlayerInput} from '../../src/server/routes/PlayerInput';
import {IGame} from '../../src/server/IGame';
import {IPlayer} from '../../src/server/IPlayer';
import {testGame} from '../TestGame';
import {finishGeneration} from '../TestingUtils';
import {MockRequest, MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';

function promptId(player: IPlayer): string | undefined {
  const waitingFor = Server.getPlayerModel(player).waitingFor as {promptId?: string} | undefined;
  return waitingFor?.promptId;
}

async function submitInput(game: IGame, player: IPlayer, body: unknown): Promise<MockResponse> {
  const req = new MockRequest();
  const res = new MockResponse();
  const scaffolding = new RouteTestScaffolding(req);
  scaffolding.url = `/player/input?id=${player.id}`;
  req.method = 'POST';
  await scaffolding.ctx.gameLoader.add(game);
  const post = scaffolding.post(PlayerInput.INSTANCE, res);
  const emit = Promise.resolve().then(() => {
    req.emitString(JSON.stringify(body));
    req.emitter.emit('end');
  });
  await Promise.all([emit, post]);
  return res;
}

// A player can still be looking at the draft repick prompt when the last player's
// pick moves the game into the research phase (or races with it). Such a stale pick
// must not be accepted as a research purchase.
describe('PlayerInput stale prompt protection', () => {
  it('rejects a stale draft repick instead of buying a card', async () => {
    const [game, player1, player2, player3] = testGame(3, {draftVariant: true});
    game.generation = 1;
    finishGeneration(game);
    expect(game.phase).eq(Phase.DRAFTING);

    for (let round = 0; round < 2; round++) {
      for (const player of [player1, player2, player3]) {
        const pick = cast(player.getWaitingFor(), SelectCard);
        player.process({type: 'card', cards: [pick.cards[0].name]});
      }
    }

    // Last draft round: player1 picks and can still change the pick until everybody picks.
    const lastPick = cast(player1.getWaitingFor(), SelectCard);
    player1.process({type: 'card', cards: [lastPick.cards[0].name]});
    const repick = cast(player1.getWaitingFor(), SelectCard);
    const stalePromptId = promptId(player1);

    for (const player of [player2, player3]) {
      const pick = cast(player.getWaitingFor(), SelectCard);
      player.process({type: 'card', cards: [pick.cards[0].name]});
    }
    expect(game.phase).eq(Phase.RESEARCH);

    const offer = cast(player1.getWaitingFor(), SelectCard).cards;
    const staleCard = repick.cards.find((card) => offer.some((offered) => offered.name === card.name));
    expect(staleCard).is.not.undefined;
    const megaCreditsBefore = player1.megaCredits;

    const res = await submitInput(game, player1, {
      type: 'card',
      cards: [staleCard?.name],
      promptId: stalePromptId,
    });

    expect(res.statusCode).eq(400);
    expect(JSON.parse(res.content).message).contains('out of date');
    // The purchase prompt is untouched: no payment prompt, no money spent.
    expect(player1.getWaitingFor()).is.instanceOf(SelectCard);
    expect(player1.megaCredits).eq(megaCreditsBefore);
  });

  it('accepts an answer to the current research purchase prompt', async () => {
    const [game, player1, player2, player3] = testGame(3, {draftVariant: true});
    game.generation = 1;
    finishGeneration(game);

    for (let round = 0; round < 3; round++) {
      for (const player of [player1, player2, player3]) {
        const pick = cast(player.getWaitingFor(), SelectCard);
        player.process({type: 'card', cards: [pick.cards[0].name]});
      }
    }
    expect(game.phase).eq(Phase.RESEARCH);

    const offer = cast(player1.getWaitingFor(), SelectCard).cards;
    const currentPromptId = promptId(player1);
    expect(currentPromptId).is.not.undefined;
    const megaCreditsBefore = player1.megaCredits;

    const res = await submitInput(game, player1, {
      type: 'card',
      cards: [offer[0].name],
      promptId: currentPromptId,
    });

    expect(res.statusCode).eq(200);
    expect(player1.megaCredits).eq(megaCreditsBefore - player1.cardCost);
    expect(player1.cardsInHand.map((card) => card.name)).includes(offer[0].name);
  });
});
