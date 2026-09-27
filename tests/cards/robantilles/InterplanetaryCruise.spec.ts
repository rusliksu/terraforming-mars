import {expect} from 'chai';
import {InterplanetaryCruise} from '../../../src/server/cards/robantilles/InterplanetaryCruise';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('InterplanetaryCruise', () => {
  let card: InterplanetaryCruise;
  let player: TestPlayer;

  beforeEach(() => {
    card = new InterplanetaryCruise();
    [/* game */, player] = testGame(1);
  });

  it('requires a TR of at least 27', () => {
    player.setTerraformRating(26);
    expect(card.canPlay(player)).is.false;
    player.setTerraformRating(27);
    expect(card.canPlay(player)).is.true;
  });

  it('increases titanium production 2 steps on play', () => {
    player.setTerraformRating(27);
    cast(card.play(player), undefined);
    expect(player.production.titanium).to.eq(2);
  });
});
