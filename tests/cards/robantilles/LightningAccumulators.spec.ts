import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {LightningAccumulators} from '../../../src/server/cards/robantilles/LightningAccumulators';
import {TestPlayer} from '../../TestPlayer';

describe('LightningAccumulators', () => {
  let card: LightningAccumulators;
  let player: TestPlayer;

  beforeEach(() => {
    card = new LightningAccumulators();
    [, player] = testGame(2);
  });

  it('has no play-time requirements', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('increases energy production 3 steps', () => {
    card.play(player);
    expect(player.production.energy).to.eq(3);
  });

  it('scores 1 flat victory point', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
