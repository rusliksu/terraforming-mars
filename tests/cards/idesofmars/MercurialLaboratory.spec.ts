import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {MercurialLaboratory} from '../../../src/server/cards/idesofmars/MercurialLaboratory';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('MercurialLaboratory', () => {
  let card: MercurialLaboratory;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MercurialLaboratory();
    [, player] = testGame(1);
  });

  it('decreases energy production 1 step on play', () => {
    player.production.override({energy: 1});
    card.play(player);
    expect(player.production.energy).eq(0);
  });

  it('cannot act without both M€ and titanium', () => {
    player.megaCredits = 0;
    player.titanium = 3;
    expect(card.canAct(player)).is.false;

    player.megaCredits = 3;
    player.titanium = 0;
    expect(card.canAct(player)).is.false;

    player.titanium = 3;
    expect(card.canAct(player)).is.true;
  });

  it('spends X M€ and X titanium for X steel and X energy', () => {
    player.megaCredits = 5;
    player.titanium = 3;
    player.steel = 0;
    player.energy = 0;

    const selectAmount = cast(card.action(player), SelectAmount);
    expect(selectAmount.min).eq(1);
    expect(selectAmount.max).eq(3);

    selectAmount.cb(2);

    expect(player.megaCredits).eq(3);
    expect(player.titanium).eq(1);
    expect(player.steel).eq(2);
    expect(player.energy).eq(2);
  });
});
