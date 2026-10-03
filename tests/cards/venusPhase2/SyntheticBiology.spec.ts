import {expect} from 'chai';
import {SyntheticBiology} from '../../../src/server/cards/venusPhase2/SyntheticBiology';
import {AsteroidMine} from '../../../src/server/cards/highOrbit/AsteroidMine';
import {Ants} from '../../../src/server/cards/base/Ants';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('SyntheticBiology', () => {
  let card: SyntheticBiology;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SyntheticBiology();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('gains 1 M€ whenever a microbe is added to any card', () => {
    const ants = new Ants();
    player.addResourceTo(ants, {qty: 2, log: true});
    expect(player.megaCredits).to.eq(2);
  });

  it('does not react to non-microbe resources', () => {
    const asteroidMine = new AsteroidMine();
    player.addResourceTo(asteroidMine, {qty: 2, log: true});
    expect(player.megaCredits).to.eq(0);
  });
});
