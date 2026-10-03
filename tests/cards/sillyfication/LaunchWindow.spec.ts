import {expect} from 'chai';
import {LaunchWindow} from '../../../src/server/cards/sillyfication/LaunchWindow';
import {BigAsteroid} from '../../../src/server/cards/base/BigAsteroid';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {CardName} from '../../../src/common/cards/CardName';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('LaunchWindow', () => {
  let card: LaunchWindow;
  let player: TestPlayer;

  beforeEach(() => {
    card = new LaunchWindow();
    [/* game */, player] = testGame(2);
  });

  it('discounts the next space card by 16 M€', () => {
    player.lastCardPlayed = CardName.LAUNCH_WINDOW;
    expect(card.getCardDiscount(player, new BigAsteroid())).to.eq(16); // space tag
    expect(card.getCardDiscount(player, new MicroCredits())).to.eq(0); // no space tag
  });

  it('costs 11 M€', () => {
    expect(card.cost).to.eq(11);
  });

  it('no discount unless it was the last card played', () => {
    player.lastCardPlayed = CardName.MICRO_CREDITS;
    expect(card.getCardDiscount(player, new BigAsteroid())).to.eq(0);
  });
});
