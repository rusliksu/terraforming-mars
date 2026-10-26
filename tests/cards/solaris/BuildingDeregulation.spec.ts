import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {BuildingDeregulation} from '../../../src/server/cards/solaris/BuildingDeregulation';
import {EnergyIndustryStandardProject} from '../../../src/server/cards/industries/EnergyIndustryStandardProject';
import {CityStandardProject} from '../../../src/server/cards/base/standardProjects/CityStandardProject';
import {forcePartiesInPlay, fakeCard} from '../../TestingUtils';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';

describe('BuildingDeregulation', () => {
  let card: BuildingDeregulation;
  let player: TestPlayer;
  let game: IGame;
  let turmoil: Turmoil;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SCIENTISTS, PartyName.EMPOWER);
    card = new BuildingDeregulation();
    [game, player] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true, industriesExpansion: true});
    turmoil = game.turmoil!;
    player.playedCards.push(fakeCard({tags: [Tag.POWER]}));
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play unless Empower rule or you have 2 delegates there', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.SCIENTISTS);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('can play when Empower are ruling', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.EMPOWER);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
  });

  it('discounts an Industry standard project by 2 M€', () => {
    const industryProject = new EnergyIndustryStandardProject();
    expect(industryProject.getAdjustedCost(player)).to.eq(10);

    player.playedCards.push(card);
    expect(industryProject.getAdjustedCost(player)).to.eq(8);
  });

  it('does not discount unrelated standard projects', () => {
    const cityProject = new CityStandardProject();
    player.playedCards.push(card);
    expect(cityProject.getAdjustedCost(player)).to.eq(cityProject.cost);
  });
});
