import {expect} from 'chai';
import {ScaffoldingForever} from '../../../src/server/cards/sillyfication/ScaffoldingForever';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('ScaffoldingForever', () => {
  let card: ScaffoldingForever;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ScaffoldingForever();
    [/* game */, player] = testGame(2);
  });

  it('raises steel production per 3 building tags, including this', () => {
    player.tagsForTest = {building: 5};
    card.play(player);
    // 5 + 1 (this) = 6; floor(6 / 3) = 2.
    expect(player.production.steel).to.eq(2);
  });
});
