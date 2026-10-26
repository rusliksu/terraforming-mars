import {expect} from 'chai';
import {PrehistoricBeasts} from '../../../src/server/cards/robantilles/PrehistoricBeasts';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Tag} from '../../../src/common/cards/Tag';
import {runAllActions} from '../../TestingUtils';

describe('PrehistoricBeasts', () => {
  let card: PrehistoricBeasts;
  let player: TestPlayer;

  beforeEach(() => {
    card = new PrehistoricBeasts();
    [/* game */, player] = testGame(2);
  });

  it('cannot play without 5 science tags', () => {
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.not.true;
  });

  it('increases M€ production 2 steps on play', () => {
    player.tagsForTest = {[Tag.SCIENCE]: 5};
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
    card.play(player);
    expect(player.production.megacredits).to.eq(2);
  });

  it('action spends 2 plants to add 1 animal', () => {
    player.playedCards.push(card);
    player.plants = 2;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(player.game);
    expect(player.plants).to.eq(0);
    expect(card.resourceCount).to.eq(1);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
