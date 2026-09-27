import {expect} from 'chai';
import {ExcavationSyriaPlanum} from '../../../src/server/cards/robantilles/ExcavationSyriaPlanum';
import {AntiGravityTechnology} from '../../../src/server/cards/base/AntiGravityTechnology';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('ExcavationSyriaPlanum', () => {
  let card: ExcavationSyriaPlanum;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ExcavationSyriaPlanum();
    player = TestPlayer.BLUE.newPlayer();
  });

  it('grants no bonus before being played', () => {
    expect(card.getTagCardRequirementBonus(player, Tag.SCIENCE)).to.eq(0);
  });

  it('reduces the science tag requirement by 2 for only the next card played', () => {
    cast(card.play(player), undefined);
    expect(card.getTagCardRequirementBonus(player, Tag.SCIENCE)).to.eq(0);

    player.lastCardPlayed = card.name;
    expect(card.getTagCardRequirementBonus(player, Tag.SCIENCE)).to.eq(2);

    player.lastCardPlayed = undefined;
    expect(card.getTagCardRequirementBonus(player, Tag.SCIENCE)).to.eq(0);
  });

  it('lets Anti-Gravity Technology (requires 7 science tags) play with only 5', () => {
    const antiGravityTechnology = new AntiGravityTechnology();
    player.playedCards.push(card);
    player.tagsForTest = {science: 5};

    expect(antiGravityTechnology.canPlay(player)).is.false;

    player.lastCardPlayed = card.name;
    expect(antiGravityTechnology.canPlay(player)).is.true;
  });
});
