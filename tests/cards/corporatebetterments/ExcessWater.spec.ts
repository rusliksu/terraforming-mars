import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {addOcean, runAllActions} from '../../TestingUtils';
import {ExcessWater} from '../../../src/server/cards/corporatebetterments/ExcessWater';
import {OCEAN_BONUS} from '../../../src/common/constants';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';

describe('ExcessWater', () => {
  let card: ExcessWater;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ExcessWater();
    [game, player] = testGame(2);
  });

  it('increases the ocean adjacency bonus by 2', () => {
    card.play(player);
    expect(player.oceanBonus).to.eq(OCEAN_BONUS + 2);
  });

  it('gives 2 extra M€ when placing next to an ocean', () => {
    card.play(player);
    player.playedCards.push(card);

    addOcean(player, '06');
    addOcean(player, '07');
    runAllActions(game);

    // The second ocean is adjacent to the first, so the bonus is collected once.
    expect(player.megaCredits).to.eq(OCEAN_BONUS + 2);
  });

  it('reverts the bonus when discarded', () => {
    card.play(player);
    card.onDiscard(player);
    expect(player.oceanBonus).to.eq(OCEAN_BONUS);
  });
});
