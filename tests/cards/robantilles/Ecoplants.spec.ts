import {expect} from 'chai';
import {Ecoplants} from '../../../src/server/cards/robantilles/Ecoplants';
import {EcoLine} from '../../../src/server/cards/corporation/EcoLine';
import {GreeneryStandardProject} from '../../../src/server/cards/base/standardProjects/GreeneryStandardProject';
import {CityStandardProject} from '../../../src/server/cards/base/standardProjects/CityStandardProject';
import {ImmigrantCity} from '../../../src/server/cards/base/ImmigrantCity';
import {Mangrove} from '../../../src/server/cards/base/Mangrove';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Resource} from '../../../src/common/Resource';

describe('Ecoplants', () => {
  let card: Ecoplants;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Ecoplants();
    [/* game */, player] = testGame(1);
  });

  it('requires plant production', () => {
    expect(card.canPlay(player)).is.false;
    player.production.add(Resource.PLANTS, 1);
    expect(card.canPlay(player)).is.true;
  });

  it('reduces the plants needed for a greenery tile by 1', () => {
    expect(player.plantsNeededForGreenery).to.eq(8);
    card.play(player);
    expect(player.plantsNeededForGreenery).to.eq(7);
  });

  it('stacks with EcoLine', () => {
    const ecoline = new EcoLine();
    ecoline.play(player);
    card.play(player);
    expect(player.plantsNeededForGreenery).to.eq(6);
  });

  it('discounts cards that place a greenery tile', () => {
    expect(card.getCardDiscount(player, new Mangrove())).to.eq(2);
  });

  it('does not discount cards that do not place a greenery tile', () => {
    expect(card.getCardDiscount(player, new ImmigrantCity())).to.eq(0);
  });

  it('discounts the Greenery standard project', () => {
    expect(card.getStandardProjectDiscount(player, new GreeneryStandardProject())).to.eq(2);
  });

  it('does not discount other standard projects', () => {
    expect(card.getStandardProjectDiscount(player, new CityStandardProject())).to.eq(0);
  });
});
