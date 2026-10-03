import {expect} from 'chai';
import {LaunchOfThePhoenix} from '../../../src/server/cards/robantilles/LaunchOfThePhoenix';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('LaunchOfThePhoenix', () => {
  let card: LaunchOfThePhoenix;
  let player: TestPlayer;

  beforeEach(() => {
    card = new LaunchOfThePhoenix();
    player = TestPlayer.BLUE.newPlayer();
  });

  it('cannot play with fewer than 7 science tags', () => {
    player.tagsForTest = {science: 6};
    expect(card.canPlay(player)).is.not.true;
  });

  it('can play with 7 science tags', () => {
    player.tagsForTest = {science: 7};
    expect(card.canPlay(player)).is.true;
  });

  it('is worth 5 victory points', () => {
    cast(card.play(player), undefined);
    expect(card.getVictoryPoints(player)).to.eq(5);
  });
});
