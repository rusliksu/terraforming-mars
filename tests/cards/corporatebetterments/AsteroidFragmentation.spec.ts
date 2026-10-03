import {expect} from 'chai';
import {AsteroidFragmentation} from '../../../src/server/cards/corporatebetterments/AsteroidFragmentation';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('AsteroidFragmentation', () => {
  let card: AsteroidFragmentation;
  let player: TestPlayer;

  beforeEach(() => {
    card = new AsteroidFragmentation();
    [/* game */, player] = testGame(2);
  });

  it('requires 6 heat, 3 steel and 3 titanium', () => {
    expect(card.canPlay(player)).is.false;

    player.heat = 6;
    player.steel = 3;
    player.titanium = 2;
    expect(card.canPlay(player)).is.false;

    player.titanium = 3;
    expect(card.canPlay(player)).is.true;
  });

  it('spends the resources and raises TR 3 steps', () => {
    player.heat = 6;
    player.steel = 3;
    player.titanium = 3;
    const startingTr = player.terraformRating;

    card.play(player);

    expect(player.heat).to.eq(0);
    expect(player.steel).to.eq(0);
    expect(player.titanium).to.eq(0);
    expect(player.terraformRating).to.eq(startingTr + 3);
  });
});
