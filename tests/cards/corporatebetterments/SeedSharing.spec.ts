import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {SeedSharing} from '../../../src/server/cards/corporatebetterments/SeedSharing';
import {TestPlayer} from '../../TestPlayer';

describe('SeedSharing', () => {
  let card: SeedSharing;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new SeedSharing();
    [/* game */, player, player2] = testGame(2);
  });

  it('cannot play unless a player has plant production', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play when an opponent has plant production', () => {
    player2.production.plants = 1;
    expect(card.canPlay(player)).is.true;
  });

  it('increases own plant production and gives every player 2 plants', () => {
    player.production.plants = 1;
    player.plants = 0;
    player2.plants = 0;

    card.play(player);

    expect(player.production.plants).to.eq(3);
    expect(player.plants).to.eq(2);
    expect(player2.plants).to.eq(2);
  });
});
