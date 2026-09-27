import {expect} from 'chai';
import {Switcharoo} from '../../../src/server/cards/sillyfication/Switcharoo';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('Switcharoo', () => {
  let card: Switcharoo;
  let player: TestPlayer;
  let player2: TestPlayer;


  beforeEach(() => {
    card = new Switcharoo();
    [/* game */, player, player2] = testGame(2);
  });

  it('cannot play without steel or an opponent with plants', () => {
    player.steel = 0;
    player2.plants = 3;
    expect(card.canPlay(player)).is.false;
    player.steel = 4;
    player2.plants = 0;
    expect(card.canPlay(player)).is.false;
    player2.plants = 3;
    expect(card.canPlay(player)).is.true;
  });

  it('swaps a chosen amount of steel for plants', () => {
    player.steel = 4;
    player.plants = 0;
    player2.steel = 0;
    player2.plants = 3;

    const selectPlayer = cast(card.play(player), SelectPlayer);
    const selectAmount = cast(selectPlayer.cb(player2), SelectAmount);
    selectAmount.cb(2);

    expect(player.steel).to.eq(2);
    expect(player.plants).to.eq(2);
    expect(player2.steel).to.eq(2);
    expect(player2.plants).to.eq(1);
  });
});
