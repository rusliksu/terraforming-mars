import {expect} from 'chai';
import {ChillingRiches} from '../../../src/server/cards/sillyfication/ChillingRiches';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('ChillingRiches', () => {
  let card: ChillingRiches;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ChillingRiches();
    [/* game */, player] = testGame(2);
  });

  it('cannot play without 3 heat production', () => {
    player.production.override({heat: 2});
    expect(card.canPlay(player)).is.false;
    player.production.override({heat: 3});
    expect(card.canPlay(player)).is.true;
  });

  it('trades 3 heat production for 11 M€ production', () => {
    player.production.override({heat: 4});
    card.play(player);
    expect(player.production.heat).to.eq(1);
    expect(player.production.megacredits).to.eq(11);
  });
});
