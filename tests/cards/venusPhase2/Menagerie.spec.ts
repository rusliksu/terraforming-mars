import {expect} from 'chai';
import {Menagerie} from '../../../src/server/cards/venusPhase2/Menagerie';
import {Birds} from '../../../src/server/cards/base/Birds';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, setTemperature} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {EmptyBoard} from '../../testing/EmptyBoard';
import {cast} from '../../../src/common/utils/utils';

describe('Menagerie', () => {
  let card: Menagerie;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new Menagerie();
    [game, player, player2] = testGame(2);
    game.board = EmptyBoard.newInstance();
  });

  it('requires -10C or warmer', () => {
    const menagerieSpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, menagerieSpace, {tileType: TileType.GREENERY});
    setTemperature(game, -12);
    expect(card.canPlay(player)).is.false;
    setTemperature(game, -10);
    expect(card.canPlay(player)).is.true;
  });

  it('cannot play without an owned greenery tile', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('places Menagerie on the player\'s own greenery, gains M€ production and animals per adjacent greenery', () => {
    const menagerieSpace = game.board.getSpaceOrThrow('15');
    const adjacentGreenery = game.board.getAdjacentSpaces(menagerieSpace)[0];
    game.simpleAddTile(player, menagerieSpace, {tileType: TileType.GREENERY});
    // Owned by the opponent -- adjacency counts any greenery, regardless of owner, and this
    // keeps the acting player's own available-space list down to just the one target space.
    game.simpleAddTile(player2, adjacentGreenery, {tileType: TileType.GREENERY});

    const ants = new Birds();
    player.playedCards.push(ants);

    const selectSpace = cast(card.play(player), SelectSpace);
    expect(selectSpace.spaces).to.deep.eq([menagerieSpace]);

    selectSpace.cb(menagerieSpace);
    runAllActions(game);

    expect(menagerieSpace.tile?.tileType).to.eq(TileType.MENAGERIE);
    expect(menagerieSpace.tile?.covers?.tileType).to.eq(TileType.GREENERY);
    expect(player.production.megacredits).to.eq(1);
    expect(ants.resourceCount).to.eq(1);
  });

  it('pays a 1-animal adjacency bonus to whoever places a tile next to it', () => {
    const menagerieSpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, menagerieSpace, {tileType: TileType.MENAGERIE, card: card.name});
    player.playedCards.push(card);

    const ants = new Birds();
    player2.playedCards.push(ants);

    const adjacent = game.board.getAdjacentSpaces(menagerieSpace)[0];
    expect(ants.resourceCount).to.eq(0);
    game.addTile(player2, adjacent, {tileType: TileType.GREENERY});
    runAllActions(game);
    expect(ants.resourceCount).to.eq(1);
  });
});
