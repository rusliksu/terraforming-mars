import {expect} from 'chai';
import {OrbitalSeedDispersal} from '../../../src/server/cards/sillyfication/OrbitalSeedDispersal';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('OrbitalSeedDispersal', () => {
  let card: OrbitalSeedDispersal;
  let player: TestPlayer;

  beforeEach(() => {
    card = new OrbitalSeedDispersal();
    [/* game */, player] = testGame(2);
  });

  it('raises plant production and gains plants scaled by space tags', () => {
    // Only this card's own space tag counts: floor(1 / 2) = 0 plants.
    card.play(player);
    expect(player.production.plants).to.eq(1);
    expect(player.plants).to.eq(0);
  });

  it('counts existing space tags, including this card', () => {
    player.tagsForTest = {space: 3};
    card.play(player);
    // 3 existing + 1 from this card = 4; 4 / 2 = 2 plants.
    expect(player.production.plants).to.eq(1);
    expect(player.plants).to.eq(2);
  });

  it('rounds the plant gain down', () => {
    player.tagsForTest = {space: 4};
    card.play(player);
    // 4 + 1 = 5; floor(5 / 2) = 2 plants.
    expect(player.plants).to.eq(2);
  });
});
