import {expect} from 'chai';
import {MineralDepot} from '../../../src/server/cards/robantilles/MineralDepot';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {cast} from '../../../src/common/utils/utils';

describe('MineralDepot', () => {
  let card: MineralDepot;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MineralDepot();
    [/* game */, player] = testGame(2);
  });

  it('offers nothing to trade when the player has no resources', () => {
    player.megaCredits = 0;
    player.steel = 0;
    player.titanium = 0;
    expect(card.play(player)).is.undefined;
  });

  it('sells steel for 2 M€ each, and can be resolved multiple times before finishing', () => {
    player.steel = 2;
    player.megaCredits = 0;

    const orOptions = cast(card.play(player), OrOptions);
    const sellSteel = orOptions.options.find((option) => option instanceof SelectAmount);
    const selectAmount = cast(sellSteel, SelectAmount);
    selectAmount.cb(2);

    expect(player.steel).to.eq(0);
    expect(player.megaCredits).to.eq(4);
  });

  it('buys titanium for 3 M€ each', () => {
    player.titanium = 0;
    player.megaCredits = 9;

    const orOptions = cast(card.play(player), OrOptions);
    const buyTitanium = orOptions.options.find((option) =>
      option instanceof SelectAmount && option.title.toString().toLowerCase().includes('buy how many titanium'));
    const selectAmount = cast(buyTitanium, SelectAmount);
    selectAmount.cb(3);

    expect(player.titanium).to.eq(3);
    expect(player.megaCredits).to.eq(0);
  });

  it('can finish without exchanging anything', () => {
    player.steel = 1;
    const orOptions = cast(card.play(player), OrOptions);
    const finish = orOptions.options.find((option) => option instanceof SelectOption);
    expect(finish).is.not.undefined;
  });
});
