import {expect} from 'chai';
import {IndustrialMetropolis} from '../../../src/server/cards/robantilles/IndustrialMetropolis';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {EmptyBoard} from '../../testing/EmptyBoard';
import {cast} from '../../../src/common/utils/utils';

describe('IndustrialMetropolis', () => {
  let card: IndustrialMetropolis;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new IndustrialMetropolis();
    [game, player, player2] = testGame(2);
    game.board = EmptyBoard.newInstance();
    player.production.override({energy: 1});
  });

  it('cannot play without an owned city', () => {
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('can play once the player owns a city', () => {
    game.simpleAddTile(player, game.board.getSpaceOrThrow('15'), {tileType: TileType.CITY});
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
  });

  it('places the tile on top of the player\'s own city and swaps energy production for steel production', () => {
    const citySpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, citySpace, {tileType: TileType.CITY});

    const selectSpace = cast(card.play(player), SelectSpace);
    expect(player.production.energy).to.eq(0);
    expect(player.production.steel).to.eq(1);
    expect(selectSpace.spaces).to.deep.eq([citySpace]);

    selectSpace.cb(citySpace);
    expect(citySpace.tile?.tileType).to.eq(TileType.INDUSTRIAL_METROPOLIS);
    expect(citySpace.tile?.covers?.tileType).to.eq(TileType.CITY);
  });

  it('only offers cities owned by this player', () => {
    const mine = game.board.getSpaceOrThrow('15');
    const theirs = game.board.getSpaceOrThrow('16');
    game.simpleAddTile(player, mine, {tileType: TileType.CITY});
    game.simpleAddTile(player2, theirs, {tileType: TileType.CITY});

    const selectSpace = cast(card.play(player), SelectSpace);
    expect(selectSpace.spaces).to.deep.eq([mine]);
  });

  it('scores 1 VP per special tile adjacent to it', () => {
    const citySpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, citySpace, {tileType: TileType.INDUSTRIAL_METROPOLIS, card: card.name});
    expect(card.getVictoryPoints(player)).to.eq(0);

    const adjacentSpaces = game.board.getAdjacentSpaces(citySpace);
    game.simpleAddTile(player, adjacentSpaces[0], {tileType: TileType.MINING_RIGHTS});
    expect(card.getVictoryPoints(player)).to.eq(1);

    // A plain greenery is not a "special" tile, so it does not count.
    game.simpleAddTile(player2, adjacentSpaces[1], {tileType: TileType.GREENERY});
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('pays a 1 steel adjacency bonus to whoever places a tile next to it', () => {
    const metroSpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, metroSpace, {tileType: TileType.INDUSTRIAL_METROPOLIS, card: card.name});
    player.playedCards.push(card);

    const adjacent = game.board.getAdjacentSpaces(metroSpace)[0];
    expect(player2.steel).to.eq(0);
    game.addTile(player2, adjacent, {tileType: TileType.GREENERY});
    expect(player2.steel).to.eq(1);
  });
});
