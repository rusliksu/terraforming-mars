import {expect} from 'chai';
import {UndergroundWorms} from '../../../src/server/cards/sillyfication/UndergroundWorms';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('UndergroundWorms', () => {
  let card: UndergroundWorms;
  let player: TestPlayer;

  beforeEach(() => {
    card = new UndergroundWorms();
    [/* game */, player] = testGame(2, {underworldExpansion: true});
    player.playedCards.push(card);
  });

  it('requires 6% oxygen', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('gains a microbe when the owner excavates', () => {
    card.onClaim(player, true, undefined);
    expect(card.resourceCount).to.eq(1);

    card.onClaim(player, false, undefined);
    expect(card.resourceCount).to.eq(1);
  });

  it('cannot act without 2 microbes', () => {
    card.resourceCount = 1;
    expect(card.canAct(player)).is.false;
    card.resourceCount = 2;
    expect(card.canAct(player)).is.true;
  });
});
