import {expect} from 'chai';
import {SlashAndBurn} from '../../../src/server/cards/sillyfication/SlashAndBurn';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('SlashAndBurn', () => {
  let card: SlashAndBurn;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SlashAndBurn();
    [/* game */, player] = testGame(2);
  });

  it('cannot be played without 2 plant production', () => {
    player.production.override({plants: 1});
    expect(card.canPlay(player)).is.false;
    player.production.override({plants: 2});
    expect(card.canPlay(player)).is.true;
  });

  it('trades 2 plant production for 6 heat production', () => {
    player.production.override({plants: 3, heat: 1});
    card.play(player);
    expect(player.production.plants).to.eq(1);
    expect(player.production.heat).to.eq(7);
  });
});
