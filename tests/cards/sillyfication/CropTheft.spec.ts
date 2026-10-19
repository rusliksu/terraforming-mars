import {expect} from 'chai';
import {CropTheft} from '../../../src/server/cards/sillyfication/CropTheft';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('CropTheft', () => {
  let card: CropTheft;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new CropTheft();
    [/* game */, player, player2] = testGame(2);
    player.plants = 0;
  });

  it('cannot play when no opponent has plants', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('steals 1 plant per plant tag you have, including this', () => {
    player.tagsForTest = {plant: 2};
    player2.plants = 8;

    const selectPlayer = cast(card.play(player), SelectPlayer);
    selectPlayer.cb(player2);

    // 2 plant tags + 1 (this) = 3.
    expect(player2.plants).to.eq(5);
    expect(player.plants).to.eq(3);
  });

  it('is capped by the target\'s plant count', () => {
    player.tagsForTest = {plant: 5};
    player2.plants = 2;

    const selectPlayer = cast(card.play(player), SelectPlayer);
    selectPlayer.cb(player2);

    expect(player2.plants).to.eq(0);
    expect(player.plants).to.eq(2);
  });
});
