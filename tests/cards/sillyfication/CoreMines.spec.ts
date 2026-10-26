import {expect} from 'chai';
import {CoreMines} from '../../../src/server/cards/sillyfication/CoreMines';
import {testGame} from '../../TestGame';

describe('CoreMines', () => {
  it('raises steel and titanium production 1 step each', () => {
    const card = new CoreMines();
    const [/* game */, player] = testGame(2);
    card.play(player);
    expect(player.production.steel).to.eq(1);
    expect(player.production.titanium).to.eq(1);
  });
});
