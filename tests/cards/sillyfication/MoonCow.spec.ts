import {expect} from 'chai';
import {MoonCow} from '../../../src/server/cards/sillyfication/MoonCow';
import {BoardType} from '../../../src/server/boards/BoardType';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('MoonCow', () => {
  let card: MoonCow;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new MoonCow();
    [/* game */, player, player2] = testGame(2, {moonExpansion: true});
    player.playedCards.push(card);
  });

  it('requires 2 habitat tiles on the Moon', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('starts with 1 animal on play', () => {
    card.bespokePlay(player);
    expect(card.resourceCount).to.eq(1);
  });

  it('gains an animal whenever any player places a tile on the Moon, but not on Mars', () => {
    const space = player.game.board.spaces[0];
    card.onTilePlaced(player, player2, space, BoardType.MOON);
    expect(card.resourceCount).to.eq(1);

    card.onTilePlaced(player, player2, space, BoardType.MARS);
    expect(card.resourceCount).to.eq(1);
  });
});
