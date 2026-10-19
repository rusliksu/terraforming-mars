import {expect} from 'chai';
import {GigaInterferometer} from '../../../src/server/cards/robantilles/GigaInterferometer';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {Phase} from '../../../src/common/Phase';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectPayment} from '../../../src/server/inputs/SelectPayment';
import {cast} from '../../../src/common/utils/utils';
import {Payment} from '../../../src/common/inputs/Payment';
import {Game} from '../../../src/server/Game';
import {SelectProjectCardToPlay} from '../../../src/server/inputs/SelectProjectCardToPlay';
import {MarsMaths} from '../../../src/server/cards/pathfinders/MarsMaths';

describe('GigaInterferometer', () => {
  let card: GigaInterferometer;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new GigaInterferometer();
    [/* game */, player, player2] = testGame(2);
    player.megaCredits = 6;
    player2.megaCredits = 6;
  });

  it('cannot play unless every player has at least 6 M€', () => {
    player2.megaCredits = 5;
    expect(card.canPlay(player)).is.not.true;
  });

  it('can play when every player has at least 6 M€', () => {
    expect(card.canPlay(player)).is.true;
  });

  for (const reloadAt of ['never', 'draft', 'purchase']) {
    it(`drafts and buys cards before resuming the turn (reload: ${reloadAt})`, () => {
      const setup = testGame(3, {draftVariant: true});
      let game = setup[0];
      const [, passedPlayer, actingPlayer] = setup;
      game.generation = 6;
      game.phase = Phase.ACTION;
      game.draftRound = 3;
      game.activePlayer = actingPlayer;
      game.playerHasPassed(passedPlayer);
      for (const p of game.players) {
        p.megaCredits = 6;
      }
      actingPlayer.actionsTakenThisRound = 1;
      actingPlayer.actionsTakenThisGame = 7;
      actingPlayer.cardsInHand.push(card);
      actingPlayer.takeAction();
      const actions = cast(actingPlayer.getWaitingFor(), OrOptions);
      const index = actions.options.findIndex((option) => option instanceof SelectProjectCardToPlay);
      actingPlayer.process({type: 'or', index, response: {type: 'projectCard', card: card.name, payment: Payment.of({})}});

      expect(game.phase).to.eq(Phase.DRAFTING);
      expect(actingPlayer.actionsTakenThisRound).to.eq(2);
      const hands = game.players.map((p) => cast(p.getWaitingFor(), SelectCard).cards.map((c) => c.name));
      hands.forEach((hand) => expect(hand).has.length(4));

      game.players[0].process({type: 'card', cards: [hands[0][0]]});
      if (reloadAt === 'draft') {
        game = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())));
      }
      for (let round = 0; round < 3; round++) {
        for (const p of game.players) {
          if (!p.needsToDraft) {
            continue;
          }
          const choice = cast(p.getWaitingFor(), SelectCard);
          p.process({type: 'card', cards: [choice.cards[0].name]});
        }
      }
      expect(game.phase).to.eq(Phase.RESEARCH);
      const offers = game.players.map((p) => cast(p.getWaitingFor(), SelectCard).cards.map((c) => c.name));
      for (let i = 0; i < 3; i++) {
        expect(offers[i]).to.deep.eq([hands[i][0], hands[(i + 2) % 3][1], hands[(i + 1) % 3][2], hands[i][3]]);
      }

      game.players[1].process({type: 'card', cards: [offers[1][0]]});
      if (reloadAt === 'purchase') {
        game = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())));
      }
      expect(game.activePlayer.id).to.eq(actingPlayer.id);
      expect(game.players[1].getWaitingFor()).is.undefined;
      expect(game.players[1].megaCredits).to.eq(3);
      game.players[0].process({type: 'card', cards: [offers[0][0]]});
      expect(game.activePlayer.id).to.eq(actingPlayer.id);
      game.players[2].process({type: 'card', cards: [offers[2][0]]});

      expect(game.activePlayer).to.eq(game.players[2]);
      expect(game.players[2].getWaitingFor()).is.instanceOf(OrOptions);
      expect(game.players[1].actionsTakenThisGame).to.eq(8);
      expect(game.generation).to.eq(6);
      expect(game.draftRound).to.eq(3);
      expect(game.phase).to.eq(Phase.ACTION);
      expect(game.first.id).to.eq(passedPlayer.id);
      expect(game.hasPassedThisActionPhase(game.players[0])).is.true;
      for (let i = 0; i < 3; i++) {
        expect(game.players[i].megaCredits).to.eq(3);
        expect(game.players[i].cardsInHand.map((c) => c.name)).to.deep.eq([offers[i][0]]);
      }
    });
  }

  it('uses the Mars Maths extra draw and first-round pick', () => {
    const [game, player] = testGame(3, {draftVariant: true});
    game.generation = 6;
    game.phase = Phase.ACTION;
    for (const p of game.players) {
      p.megaCredits = 30;
    }
    player.playedCards.push(new MarsMaths());
    card.play(player);
    player.takeAction();
    const firstPick = cast(player.getWaitingFor(), SelectCard);
    expect(firstPick.cards).has.length(5);
    expect(firstPick.config.min).to.eq(2);
    expect(firstPick.config.max).to.eq(2);
    for (let round = 0; round < 3; round++) {
      for (const p of game.players) {
        const choice = cast(p.getWaitingFor(), SelectCard);
        p.process({type: 'card', cards: choice.cards.slice(0, p === player && round === 0 ? 2 : 1).map((c) => c.name)});
      }
    }
    const buy = cast(player.getWaitingFor(), SelectCard);
    expect(game.phase).to.eq(Phase.RESEARCH);
    expect(buy.cards).has.length(5);
    expect(buy.config.max).to.eq(4);
    expect(game.players.slice(1).map((p) => cast(p.getWaitingFor(), SelectCard).cards.length)).to.deep.eq([4, 4]);
  });

  it('restores exchanged research cards and the purchase limit without repeating an exchange', () => {
    const game = player.game;
    game.generation = 6;
    game.phase = Phase.ACTION;
    player.underworldData.corruption = 2;
    player.nextResearchKeepMax = 1;
    card.play(player);
    player.takeAction();
    const exchange = cast(cast(player.getWaitingFor(), OrOptions).options[1], SelectCard);
    player.process({type: 'or', index: 1, response: {type: 'card', cards: exchange.cards.slice(0, 2).map((c) => c.name)}});
    const offered = cast(player.getWaitingFor(), SelectCard).cards.map((c) => c.name);

    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())));
    const restoredPlayer = restored.players[0];
    const buy = cast(restoredPlayer.getWaitingFor(), SelectCard);
    expect(buy.cards.map((c) => c.name)).to.deep.eq(offered);
    expect(buy.config.max).to.eq(1);
    expect(restoredPlayer.underworldData.corruption).to.eq(1);
  });

  it('resumes the current turn only after the last purchase is paid', () => {
    const game = player.game;
    game.generation = 6;
    game.phase = Phase.ACTION;
    player.actionsTakenThisRound = 1;
    player2.canUseHeatAsMegaCredits = true;
    player2.heat = 3;
    card.play(player);
    player.takeAction();

    const choice = cast(player2.getWaitingFor(), SelectCard);
    expect(choice.cards).has.length(4);
    const boughtCard = choice.cards[0];
    player2.process({type: 'card', cards: [boughtCard.name]});
    expect(player2.getWaitingFor()).is.instanceOf(SelectPayment);

    player.process({type: 'card', cards: []});
    expect(player.getWaitingFor()).is.undefined;
    expect(player.actionsTakenThisRound).to.eq(1);
    expect(player2.cardsInHand).does.not.include(boughtCard);

    player2.process({type: 'payment', payment: Payment.of({heat: 3})});
    expect(player2.cardsInHand).includes(boughtCard);
    expect(player2.heat).to.eq(0);
    expect(player2.megaCredits).to.eq(6);
    expect(player2.getWaitingFor()).is.undefined;
    expect(game.activePlayer).to.eq(player);
    expect(player.actionsTakenThisRound).to.eq(1);
    expect(player.getWaitingFor()).is.instanceOf(OrOptions);
    expect(game.additionalResearch).is.undefined;
  });
});
