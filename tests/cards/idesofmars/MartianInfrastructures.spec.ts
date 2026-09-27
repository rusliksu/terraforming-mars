import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {MartianInfrastructures} from '../../../src/server/cards/idesofmars/MartianInfrastructures';
import {CityStandardProject} from '../../../src/server/cards/base/standardProjects/CityStandardProject';
import {GreeneryStandardProject} from '../../../src/server/cards/base/standardProjects/GreeneryStandardProject';
import {AquiferStandardProject} from '../../../src/server/cards/base/standardProjects/AquiferStandardProject';
import {PowerPlantStandardProject} from '../../../src/server/cards/base/standardProjects/PowerPlantStandardProject';
import {Capital} from '../../../src/server/cards/base/Capital';
import {Research} from '../../../src/server/cards/base/Research';
import {Resource} from '../../../src/common/Resource';
import {TestPlayer} from '../../TestPlayer';

describe('MartianInfrastructures', () => {
  let card: MartianInfrastructures;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MartianInfrastructures();
    [/* game */, player] = testGame(1);
    // Production can't go below 0, so the card's own -1 energy step needs a starting cushion.
    player.production.add(Resource.ENERGY, 1);
  });

  it('decreases energy production on play', () => {
    const startingProduction = player.production.energy;
    card.play(player);
    expect(player.production.energy).to.eq(startingProduction - 1);
  });

  it('discounts standard projects that place a tile on Mars', () => {
    expect(card.getStandardProjectDiscount(player, new CityStandardProject())).to.eq(2);
    expect(card.getStandardProjectDiscount(player, new GreeneryStandardProject())).to.eq(2);
    expect(card.getStandardProjectDiscount(player, new AquiferStandardProject())).to.eq(2);
  });

  it('does not discount standard projects that do not place a tile', () => {
    expect(card.getStandardProjectDiscount(player, new PowerPlantStandardProject())).to.eq(0);
  });

  it('discounts cards that place a tile on Mars', () => {
    expect(card.getCardDiscount(player, new Capital())).to.eq(2);
  });

  it('does not discount cards that do not place a tile', () => {
    expect(card.getCardDiscount(player, new Research())).to.eq(0);
  });
});
