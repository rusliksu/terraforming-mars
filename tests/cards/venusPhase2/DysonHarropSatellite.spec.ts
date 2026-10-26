import {expect} from 'chai';
import {DysonHarropSatellite} from '../../../src/server/cards/venusPhase2/DysonHarropSatellite';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('DysonHarropSatellite', () => {
  let card: DysonHarropSatellite;
  let player: TestPlayer;

  beforeEach(() => {
    card = new DysonHarropSatellite();
    [/* game */, player] = testGame(2);
  });

  it('requires 2 Science tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tags.extraScienceTags = 2;
    expect(card.canPlay(player)).is.true;
  });

  it('increases energy production 3 steps', () => {
    card.play(player);
    expect(player.production.energy).to.eq(3);
  });
});
