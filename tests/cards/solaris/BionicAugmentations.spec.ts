import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {BionicAugmentations} from '../../../src/server/cards/solaris/BionicAugmentations';
import {AntiGravityTechnology} from '../../../src/server/cards/base/AntiGravityTechnology';
import {Tag} from '../../../src/common/cards/Tag';
import {forcePartiesInPlay} from '../../TestingUtils';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('BionicAugmentations', () => {
  let card: BionicAugmentations;
  let player: TestPlayer;
  let game: IGame;
  let turmoil: Turmoil;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SCIENTISTS, PartyName.TRANSHUMANISTS);
    card = new BionicAugmentations();
    [game, player] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
    turmoil = game.turmoil!;
    player.megaCredits = card.cost;
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play unless Transhumanists rule or you have 2 delegates there', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.SCIENTISTS);
    expect(card.canPlay(player)).is.false;
  });

  it('can play when Transhumanists are ruling', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.TRANSHUMANISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('grants no bonus before being played', () => {
    expect(player.getTagCardRequirementBonus(Tag.SCIENCE)).to.eq(0);
  });

  it('permanently reduces the Science tag requirement by 2 while in play', () => {
    player.playedCards.push(card);
    expect(player.getTagCardRequirementBonus(Tag.SCIENCE)).to.eq(2);
  });

  it('lets Anti-Gravity Technology (requires 7 Science tags) play with only 5', () => {
    const antiGravityTechnology = new AntiGravityTechnology();
    player.playedCards.push(card);
    player.tagsForTest = {science: 5};

    expect(antiGravityTechnology.canPlay(player)).is.true;
  });
});
