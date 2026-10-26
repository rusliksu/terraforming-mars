import {expect} from 'chai';
import {HighPressureSuits} from '../../../src/server/cards/venusPhase2/HighPressureSuits';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('HighPressureSuits', () => {
  let card: HighPressureSuits;
  let player: TestPlayer;

  beforeEach(() => {
    card = new HighPressureSuits();
    [/* game */, player] = testGame(2);
  });

  it('requires at most 2 Jovian tags', () => {
    expect(card.canPlay(player)).is.true;
    player.tags.extraJovianTags = 3;
    expect(card.canPlay(player)).is.false;
    player.tags.extraJovianTags = 2;
    expect(card.canPlay(player)).is.true;
  });

  it('is worth 2 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
