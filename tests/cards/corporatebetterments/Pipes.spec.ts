import {expect} from 'chai';
import {Pipes} from '../../../src/server/cards/corporatebetterments/Pipes';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {EmptyBoard} from '../../testing/EmptyBoard';
import {TileType} from '../../../src/common/TileType';

describe('Pipes', () => {
  let card: Pipes;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Pipes();
    [game, player, player2] = testGame(2);
    game.board = EmptyBoard.newInstance();
  });

  it('gains 1 M€ for each of your tiles adjacent to an ocean', () => {
    // '15' and '16' are both adjacent to '09' and to each other.
    game.simpleAddTile(player, game.board.getSpaceOrThrow('15'), {tileType: TileType.OCEAN});
    game.simpleAddTile(player, game.board.getSpaceOrThrow('09'), {tileType: TileType.CITY});
    game.simpleAddTile(player, game.board.getSpaceOrThrow('16'), {tileType: TileType.GREENERY});
    // '21' isn't adjacent to any ocean.
    game.simpleAddTile(player, game.board.getSpaceOrThrow('21'), {tileType: TileType.CITY});

    card.play(player);

    expect(player.megaCredits).to.eq(2);
  });

  it('ignores tiles owned by other players', () => {
    game.simpleAddTile(player, game.board.getSpaceOrThrow('15'), {tileType: TileType.OCEAN});
    game.simpleAddTile(player2, game.board.getSpaceOrThrow('09'), {tileType: TileType.CITY});

    card.play(player);

    expect(player.megaCredits).to.eq(0);
  });
});
