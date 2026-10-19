import {expect} from 'chai';
import {ThermalSmeltery} from '../../../src/server/cards/sillyfication/ThermalSmeltery';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('ThermalSmeltery', () => {
  let card: ThermalSmeltery;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ThermalSmeltery();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('cannot act without 6 heat', () => {
    player.heat = 5;
    expect(card.canAct(player)).is.false;
    player.heat = 6;
    expect(card.canAct(player)).is.true;
  });

  it('spends 6 heat for 3 titanium', () => {
    player.heat = 6;
    card.action(player);
    runAllActions(player.game);
    expect(player.heat).to.eq(0);
    expect(player.titanium).to.eq(3);
  });
});
