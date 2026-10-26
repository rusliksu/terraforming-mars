import {expect} from 'chai';
import {ParadiseCity} from '../../../src/server/cards/robantilles/ParadiseCity';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {EmptyBoard} from '../../testing/EmptyBoard';
import {cast} from '../../../src/common/utils/utils';

describe('ParadiseCity', () => {
  let card: ParadiseCity;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new ParadiseCity();
    [game, player, player2] = testGame(2);
    game.board = EmptyBoard.newInstance();
  });

  it('cannot play without an owned city adjacent to an ocean', () => {
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('cannot play with an owned city that is not adjacent to an ocean', () => {
    game.simpleAddTile(player, game.board.getSpaceOrThrow('15'), {tileType: TileType.CITY});
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('can play once the player owns a city adjacent to an ocean', () => {
    const citySpace = game.board.getSpaceOrThrow('15');
    const oceanSpace = game.board.getAdjacentSpaces(citySpace)[0];
    game.simpleAddTile(player, citySpace, {tileType: TileType.CITY});
    game.simpleAddTile(player, oceanSpace, {tileType: TileType.OCEAN});
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
  });

  it('replaces the city with Paradise City, which still counts as a city', () => {
    const citySpace = game.board.getSpaceOrThrow('15');
    const oceanSpace = game.board.getAdjacentSpaces(citySpace)[0];
    game.simpleAddTile(player, citySpace, {tileType: TileType.CITY});
    game.simpleAddTile(player, oceanSpace, {tileType: TileType.OCEAN});

    const selectSpace = cast(card.play(player), SelectSpace);
    expect(selectSpace.spaces).to.deep.eq([citySpace]);

    selectSpace.cb(citySpace);
    expect(citySpace.tile?.tileType).to.eq(TileType.PARADISE_CITY);
    expect(citySpace.tile?.covers?.tileType).to.eq(TileType.CITY);
    expect(game.board.getCities(player)).to.include(citySpace);
  });

  it('only offers cities owned by this player', () => {
    const mine = game.board.getSpaceOrThrow('15');
    const theirs = game.board.getSpaceOrThrow('16');
    const mineOcean = game.board.getAdjacentSpaces(mine)[0];
    const theirsOcean = game.board.getAdjacentSpaces(theirs)[0];
    game.simpleAddTile(player, mine, {tileType: TileType.CITY});
    game.simpleAddTile(player, mineOcean, {tileType: TileType.OCEAN});
    game.simpleAddTile(player2, theirs, {tileType: TileType.CITY});
    game.simpleAddTile(player2, theirsOcean, {tileType: TileType.OCEAN});

    const selectSpace = cast(card.play(player), SelectSpace);
    expect(selectSpace.spaces).to.deep.eq([mine]);
  });

  it('scores 1 VP for each greenery adjacent to it', () => {
    const citySpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, citySpace, {tileType: TileType.PARADISE_CITY, card: card.name});
    expect(card.getVictoryPoints(player)).to.eq(0);

    const adjacentSpaces = game.board.getAdjacentSpaces(citySpace);
    game.simpleAddTile(player2, adjacentSpaces[0], {tileType: TileType.GREENERY});
    expect(card.getVictoryPoints(player)).to.eq(1);

    game.simpleAddTile(player, adjacentSpaces[1], {tileType: TileType.GREENERY});
    expect(card.getVictoryPoints(player)).to.eq(2);
  });

  it('pays a 1 M€ adjacency bonus to whoever places a tile next to it', () => {
    const citySpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, citySpace, {tileType: TileType.PARADISE_CITY, card: card.name});
    player.playedCards.push(card);

    const adjacent = game.board.getAdjacentSpaces(citySpace)[0];
    expect(player2.megaCredits).to.eq(0);
    game.addTile(player2, adjacent, {tileType: TileType.GREENERY});
    expect(player2.megaCredits).to.eq(1);
  });
});
