import {expect} from 'chai';
import {Suburbs} from '../../../src/server/cards/robantilles/Suburbs';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {EmptyBoard} from '../../testing/EmptyBoard';
import {cast} from '../../../src/common/utils/utils';

describe('Suburbs', () => {
  let card: Suburbs;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new Suburbs();
    [game, player, player2] = testGame(2);
    game.board = EmptyBoard.newInstance();
  });

  it('cannot play without an owned greenery tile', () => {
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('can play once the player owns a greenery tile', () => {
    game.simpleAddTile(player, game.board.getSpaceOrThrow('15'), {tileType: TileType.GREENERY});
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
  });

  it('places Suburbs on top of the player\'s own greenery, raises M€ production, and counts as a city', () => {
    const greenerySpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, greenerySpace, {tileType: TileType.GREENERY});

    const selectSpace = cast(card.play(player), SelectSpace);
    expect(player.production.megacredits).to.eq(3);
    expect(selectSpace.spaces).to.deep.eq([greenerySpace]);

    selectSpace.cb(greenerySpace);
    expect(greenerySpace.tile?.tileType).to.eq(TileType.SUBURBS);
    expect(greenerySpace.tile?.covers?.tileType).to.eq(TileType.GREENERY);
    expect(game.board.getCities(player)).to.include(greenerySpace);
  });

  it('only offers greenery tiles owned by this player', () => {
    const mine = game.board.getSpaceOrThrow('15');
    const theirs = game.board.getSpaceOrThrow('16');
    game.simpleAddTile(player, mine, {tileType: TileType.GREENERY});
    game.simpleAddTile(player2, theirs, {tileType: TileType.GREENERY});

    const selectSpace = cast(card.play(player), SelectSpace);
    expect(selectSpace.spaces).to.deep.eq([mine]);
  });

  it('pays a 1 M€ adjacency bonus to whoever places a tile next to it', () => {
    const suburbsSpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, suburbsSpace, {tileType: TileType.SUBURBS, card: card.name});
    player.playedCards.push(card);

    const adjacent = game.board.getAdjacentSpaces(suburbsSpace)[0];
    expect(player2.megaCredits).to.eq(0);
    game.addTile(player2, adjacent, {tileType: TileType.GREENERY});
    expect(player2.megaCredits).to.eq(1);
  });

  it('does not pay itself an adjacency bonus when it is placed', () => {
    const greenerySpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, greenerySpace, {tileType: TileType.GREENERY});
    player.playedCards.push(card);

    const selectSpace = cast(card.play(player), SelectSpace);
    const before = player.megaCredits;
    selectSpace.cb(greenerySpace);
    expect(player.megaCredits).to.eq(before);
  });
});
