import {expect} from 'chai';
import {ArchitecturalContracts} from '../../../src/server/cards/corporatebetterments/ArchitecturalContracts';
import {ImmigrantCity} from '../../../src/server/cards/base/ImmigrantCity';
import {CityStandardProject} from '../../../src/server/cards/base/standardProjects/CityStandardProject';
import {GreeneryStandardProject} from '../../../src/server/cards/base/standardProjects/GreeneryStandardProject';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addCity} from '../../TestingUtils';

describe('ArchitecturalContracts', () => {
  let card: ArchitecturalContracts;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ArchitecturalContracts();
    [/* game */, player] = testGame(1);
  });

  it('requires owning a city', () => {
    expect(card.canPlay(player)).is.false;
    addCity(player);
    expect(card.canPlay(player)).is.true;
  });

  it('discounts cards with a city tag', () => {
    const immigrantCity = new ImmigrantCity();
    expect(card.getCardDiscount(player, immigrantCity)).eq(3);
  });

  it('discounts the City standard project', () => {
    const cityStandardProject = new CityStandardProject();
    expect(card.getStandardProjectDiscount(player, cityStandardProject)).eq(3);
  });

  it('does not discount other standard projects', () => {
    expect(card.getStandardProjectDiscount(player, new GreeneryStandardProject())).eq(0);
  });

  it('scores 2 VP', () => {
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
