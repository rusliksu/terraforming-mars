import {expect} from 'chai';
import {ColdLikeSteel} from '../../../src/server/cards/sillyfication/ColdLikeSteel';
import {testGame} from '../../TestGame';

describe('ColdLikeSteel', () => {
  it('trades 1 heat production for 3 steel production', () => {
    const card = new ColdLikeSteel();
    const [/* game */, player] = testGame(2);
    player.production.override({heat: 1});
    card.play(player);
    expect(player.production.heat).to.eq(0);
    expect(player.production.steel).to.eq(3);
  });
});
