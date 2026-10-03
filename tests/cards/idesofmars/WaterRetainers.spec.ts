import {expect} from 'chai';
import {WaterRetainers} from '../../../src/server/cards/idesofmars/WaterRetainers';
import {GreeneryStandardProject} from '../../../src/server/cards/base/standardProjects/GreeneryStandardProject';
import {AquiferStandardProject} from '../../../src/server/cards/base/standardProjects/AquiferStandardProject';
import {SmallComet} from '../../../src/server/cards/pathfinders/SmallComet';
import {Plantation} from '../../../src/server/cards/base/Plantation';
import {Zeppelins} from '../../../src/server/cards/base/Zeppelins';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('WaterRetainers', () => {
  let card: WaterRetainers;
  let player: TestPlayer;

  beforeEach(() => {
    card = new WaterRetainers();
    [, player] = testGame(1);
  });

  it('increases plant production 1 step on play', () => {
    card.play(player);
    expect(player.production.plants).eq(1);
  });

  it('discounts cards that place a greenery or ocean tile', () => {
    expect(card.getCardDiscount(player, new Plantation())).eq(2);
    // SmallComet places an ocean, not a greenery, so it gets the ocean discount, not the greenery one.
    expect(card.getCardDiscount(player, new SmallComet())).eq(3);
    // Zeppelins places no tile at all.
    expect(card.getCardDiscount(player, new Zeppelins())).eq(0);
  });

  it('discounts the Greenery and Aquifer standard projects', () => {
    expect(card.getStandardProjectDiscount(player, new GreeneryStandardProject())).eq(2);
    expect(card.getStandardProjectDiscount(player, new AquiferStandardProject())).eq(3);
  });
});
