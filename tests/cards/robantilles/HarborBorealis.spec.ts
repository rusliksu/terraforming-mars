import {expect} from 'chai';
import {HarborBorealis} from '../../../src/server/cards/robantilles/HarborBorealis';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {EmptyBoard} from '../../testing/EmptyBoard';
import {cast} from '../../../src/common/utils/utils';
import {Space} from '../../../src/server/boards/Space';

describe('HarborBorealis', () => {
  let card: HarborBorealis;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new HarborBorealis();
    [game, player, player2] = testGame(2);
    game.board = EmptyBoard.newInstance();
  });

  function addPlainOceans(count: number, excluded: Array<Space> = []) {
    const excludedIds = excluded.map((s) => s.id);
    const spaces = game.board.spaces.filter((s) => !excludedIds.includes(s.id) && s.tile === undefined);
    for (let i = 0; i < count; i++) {
      game.simpleAddTile(player, spaces[i], {tileType: TileType.OCEAN});
    }
  }

  it('cannot play without 5 oceans in play', () => {
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
    addPlainOceans(4);
    expect(card.canPlay(player)).is.false;
  });

  it('cannot play without an ocean adjacent to a city, even with 5 oceans', () => {
    player.megaCredits = card.cost;
    addPlainOceans(5);
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 5 oceans in play and an ocean adjacent to a city', () => {
    player.megaCredits = card.cost;
    const citySpace = game.board.spaces[10];
    const targetOcean = game.board.getAdjacentSpaces(citySpace)[0];
    game.simpleAddTile(player2, citySpace, {tileType: TileType.CITY});
    game.simpleAddTile(player, targetOcean, {tileType: TileType.OCEAN});
    addPlainOceans(4, [citySpace, targetOcean]);

    expect(card.canPlay(player)).is.true;
  });

  it('places the tile over the ocean, gains M€ production per adjacent ocean, and scores VP per adjacent ocean', () => {
    const citySpace = game.board.spaces[10];
    const targetOcean = game.board.getAdjacentSpaces(citySpace)[0];
    const secondOcean = game.board.getAdjacentSpaces(targetOcean).find((s) => s.id !== citySpace.id)!;
    game.simpleAddTile(player2, citySpace, {tileType: TileType.CITY});
    game.simpleAddTile(player, targetOcean, {tileType: TileType.OCEAN});
    game.simpleAddTile(player, secondOcean, {tileType: TileType.OCEAN});

    const selectSpace = cast(card.play(player), SelectSpace);
    expect(selectSpace.spaces).to.include(targetOcean);

    selectSpace.cb(targetOcean);
    expect(targetOcean.tile?.tileType).to.eq(TileType.HARBOR_BOREALIS);
    expect(targetOcean.tile?.covers?.tileType).to.eq(TileType.OCEAN);
    expect(player.production.megacredits).to.eq(1);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('pays a 1 steel adjacency bonus to whoever places a tile next to it', () => {
    const harborSpace = game.board.getSpaceOrThrow('15');
    game.simpleAddTile(player, harborSpace, {tileType: TileType.HARBOR_BOREALIS, card: card.name});
    player.playedCards.push(card);

    const adjacent = game.board.getAdjacentSpaces(harborSpace)[0];
    expect(player2.steel).to.eq(0);
    game.addTile(player2, adjacent, {tileType: TileType.GREENERY});
    expect(player2.steel).to.eq(1);
  });
});
