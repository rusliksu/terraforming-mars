import {expect} from 'chai';
import {FloaterFactory} from '../../../src/server/cards/venusPhase2/FloaterFactory';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';

describe('FloaterFactory', () => {
  let card: FloaterFactory;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new FloaterFactory();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('increases heat production 1 step on play', () => {
    card.play(player);
    expect(player.production.heat).to.eq(1);
  });

  it('cannot act without 1 heat', () => {
    player.heat = 0;
    expect(card.canAct(player)).is.false;
    player.heat = 1;
    expect(card.canAct(player)).is.true;
  });

  it('spends 1 heat to add 1 floater to a card', () => {
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    player.heat = 1;

    card.action(player);
    runAllActions(game);

    expect(player.heat).to.eq(0);
    expect(dirigibles.resourceCount).to.eq(1);
  });
});
