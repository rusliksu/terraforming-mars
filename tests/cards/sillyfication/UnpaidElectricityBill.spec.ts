import {expect} from 'chai';
import {UnpaidElectricityBill} from '../../../src/server/cards/sillyfication/UnpaidElectricityBill';
import {Resource} from '../../../src/common/Resource';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('UnpaidElectricityBill', () => {
  let card: UnpaidElectricityBill;
  let player: TestPlayer;

  beforeEach(() => {
    card = new UnpaidElectricityBill();
    [/* game */, player] = testGame(2);
  });

  it('cannot play without energy production', () => {
    expect(card.canPlay(player)).is.false;
    player.production.add(Resource.ENERGY, 1);
    expect(card.canPlay(player)).is.true;
  });

  it('gains 9 M€ and lowers energy production', () => {
    player.production.override({energy: 2});
    player.megaCredits = 0;

    card.play(player);

    expect(player.megaCredits).to.eq(9);
    expect(player.production.energy).to.eq(1);
  });
});
