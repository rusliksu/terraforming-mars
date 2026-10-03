import {expect} from 'chai';
import {SandClaim} from '../../../src/server/cards/sillyfication/SandClaim';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {CardType} from '../../../src/common/cards/CardType';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('SandClaim', () => {
  it('is a 3 M€ event', () => {
    const card = new SandClaim();
    expect(card.type).eq(CardType.EVENT);
    expect(card.cost).eq(3);
  });

  it('claims 3 non-reserved spaces, one at a time, with no tile or bonus', () => {
    const card = new SandClaim();
    const [/* game */, player] = testGame(2);

    const first = cast(card.play(player), SelectSpace);
    const space1 = first.spaces[0];
    const second = cast(first.cb(space1), SelectSpace);
    expect(space1.player).eq(player);
    expect(space1.tile).is.undefined;

    const space2 = second.spaces[0];
    const third = cast(second.cb(space2), SelectSpace);
    expect(space2.player).eq(player);

    const space3 = third.spaces[0];
    const result = third.cb(space3);
    expect(space3.player).eq(player);
    expect(result).is.undefined;

    expect(new Set([space1.id, space2.id, space3.id]).size).eq(3);
  });

  it('cannot play when there are no non-reserved spaces left', () => {
    const card = new SandClaim();
    const [game, player] = testGame(2);
    for (const space of game.board.getNonReservedLandSpaces()) {
      space.player = player;
    }
    expect(card.canPlay(player)).is.false;
  });

  it('stops early if fewer than 3 spaces remain', () => {
    const card = new SandClaim();
    const [game, player] = testGame(2);
    const remaining = game.board.getNonReservedLandSpaces();
    // Claim all but 2 spaces, leaving too few for a full 3-space claim.
    for (const space of remaining.slice(2)) {
      space.player = player;
    }

    const first = cast(card.play(player), SelectSpace);
    const space1 = first.spaces[0];
    const second = cast(first.cb(space1), SelectSpace);
    const space2 = second.spaces[0];
    const result = second.cb(space2);

    expect(result).is.undefined;
  });
});
