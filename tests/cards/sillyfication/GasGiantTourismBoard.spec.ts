import {expect} from 'chai';
import {GasGiantTourismBoard} from '../../../src/server/cards/sillyfication/GasGiantTourismBoard';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('GasGiantTourismBoard', () => {
  let card: GasGiantTourismBoard;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GasGiantTourismBoard();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('action gains 1 M€ per Jovian tag', () => {
    player.megaCredits = 0;
    player.tagsForTest = {jovian: 3};

    card.action(player);
    runAllActions(player.game);

    expect(player.megaCredits).to.eq(3);
  });

  it('scores 1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
