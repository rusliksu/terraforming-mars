import {expect} from 'chai';
import {MeteorShower} from '../../../src/server/cards/robantilles/MeteorShower';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('MeteorShower', () => {
  let card: MeteorShower;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MeteorShower();
    [/* game */, player] = testGame(1);
  });

  it('gains 5 steel and 4 titanium on play', () => {
    cast(card.play(player), undefined);

    expect(player.steel).to.eq(5);
    expect(player.titanium).to.eq(4);
  });
});
