import {expect} from 'chai';
import {FloatingRig} from '../../../src/server/cards/idesofmars/FloatingRig';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, setVenusScaleLevel} from '../../TestingUtils';

describe('FloatingRig', () => {
  let card: FloatingRig;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new FloatingRig();
    [game, player] = testGame(1, {venusNextExtension: true});
  });

  it('cannot play above 16% Venus', () => {
    setVenusScaleLevel(game, 18);
    expect(card.canPlay(player)).is.false;
  });

  it('can play at 16% Venus', () => {
    setVenusScaleLevel(game, 16);
    expect(card.canPlay(player)).is.true;
  });

  it('increases energy production on play', () => {
    setVenusScaleLevel(game, 16);
    card.play(player);
    expect(player.production.energy).to.eq(1);
  });

  it('cannot act without steel', () => {
    player.steel = 0;
    expect(card.canAct(player)).is.false;
  });

  it('spends 1 steel to add a floater to this card', () => {
    player.steel = 1;
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(player.steel).to.eq(0);
    expect(card.resourceCount).to.eq(1);
  });

  it('scores 1 VP per 2 floaters on this card', () => {
    player.addResourceTo(card, 5);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
