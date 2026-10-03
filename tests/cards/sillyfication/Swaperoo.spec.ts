import {expect} from 'chai';
import {Swaperoo} from '../../../src/server/cards/sillyfication/Swaperoo';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('Swaperoo', () => {
  let card: Swaperoo;
  let player: TestPlayer;
  let player2: TestPlayer;


  beforeEach(() => {
    card = new Swaperoo();
    [/* game */, player, player2] = testGame(2);
  });

  it('cannot play without steel or an opponent with titanium', () => {
    player.steel = 0;
    player2.titanium = 3;
    expect(card.canPlay(player)).is.false;
    player.steel = 4;
    player2.titanium = 0;
    expect(card.canPlay(player)).is.false;
    player2.titanium = 3;
    expect(card.canPlay(player)).is.true;
  });

  it('swaps a chosen amount of steel for titanium', () => {
    player.steel = 4;
    player.titanium = 0;
    player2.steel = 0;
    player2.titanium = 3;

    const selectPlayer = cast(card.play(player), SelectPlayer);
    const selectAmount = cast(selectPlayer.cb(player2), SelectAmount);
    selectAmount.cb(2);

    expect(player.steel).to.eq(2);
    expect(player.titanium).to.eq(2);
    expect(player2.steel).to.eq(2);
    expect(player2.titanium).to.eq(1);
  });
});
