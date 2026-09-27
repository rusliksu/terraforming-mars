import {expect} from 'chai';
import {CustomBoard} from '../../src/server/boards/CustomBoard';
import {Board} from '../../src/server/boards/Board';
import {BoardName} from '../../src/common/boards/BoardName';
import {SpaceType} from '../../src/common/boards/SpaceType';
import {SpaceBonus} from '../../src/common/boards/SpaceBonus';
import {DEFAULT_GAME_OPTIONS, GameOptions} from '../../src/server/game/GameOptions';
import {SeededRandom} from '../../src/common/utils/Random';
import {blankCustomBoard, CustomBoardDefinition} from '../../src/common/boards/CustomBoardDefinition';
import {TestPlayer} from '../TestPlayer';

function optionsFor(def: CustomBoardDefinition): GameOptions {
  return {...DEFAULT_GAME_OPTIONS, boardName: BoardName.CUSTOM, customBoard: def};
}

function build(def: CustomBoardDefinition): CustomBoard {
  return CustomBoard.newInstance(optionsFor(def), new SeededRandom(0));
}

describe('CustomBoard', () => {
  it('builds the standard-size hexagon with colony spaces', () => {
    const board = build(blankCustomBoard(9, 'Test'));
    // 61 mars + Ganymede + Phobos
    expect(board.spaces).to.have.length(63);
    expect(board.getSpaceOrThrow('01').spaceType).eq(SpaceType.COLONY);
    expect(board.getSpaceOrThrow('100').spaceType).eq(SpaceType.LAND);
  });

  it('computes hex adjacency for a small (5-row) board', () => {
    const board = build(blankCustomBoard(5, 'Small'));
    // 3 + 4 + 5 + 4 + 3 = 19 spaces
    const marsSpaces = board.spaces.filter((s) => s.spaceType !== SpaceType.COLONY);
    expect(marsSpaces).to.have.length(19);

    const center = marsSpaces.find((s) => s.x === 2 && s.y === 2)!;
    expect(board.getAdjacentSpaces(center)).to.have.length(6);

    const corner = marsSpaces.find((s) => s.y === 0 && s.x === 2)!;
    expect(board.getAdjacentSpaces(corner).length).to.be.lessThan(6);
  });

  it('getEdges is the perimeter (spaces with fewer than 6 neighbours)', () => {
    const board = build(blankCustomBoard(7, 'Edges'));
    const edges = new Set(board.getEdges().map((s) => s.id));
    for (const space of board.spaces) {
      if (space.spaceType === SpaceType.COLONY) {
        continue;
      }
      const isEdge = board.getAdjacentSpaces(space).length < 6;
      expect(edges.has(space.id)).to.eq(isEdge, `space ${space.id} at ${space.x},${space.y}`);
    }
  });

  it('treats deflection zones as land', () => {
    const def = blankCustomBoard(9, 'Deflection');
    def.spaces[10].spaceType = SpaceType.DEFLECTION_ZONE;
    const board = build(def);
    expect(board.getSpaces(SpaceType.LAND).some((s) => s.id === def.spaces[10].id)).is.true;
  });

  it('treats coves as both land and ocean', () => {
    const def = blankCustomBoard(9, 'Coves');
    def.spaces[12].spaceType = SpaceType.COVE;
    const board = build(def);
    const coveId = def.spaces[12].id;
    expect(board.getSpaces(SpaceType.LAND).some((s) => s.id === coveId)).is.true;
    expect(board.getSpaces(SpaceType.OCEAN).some((s) => s.id === coveId)).is.true;

    const player = TestPlayer.BLUE.newPlayer();
    (player as any).game = {gameOptions: DEFAULT_GAME_OPTIONS, nomadSpace: undefined};
    expect(board.getAvailableSpacesForOcean(player).some((s) => s.id === coveId)).is.true;
  });

  it('excludes reserved spaces from placement', () => {
    const def = blankCustomBoard(9, 'Reserved');
    def.spaces[20].reserved = true;
    const board = build(def);
    const reserved = board.getSpaceOrThrow(def.spaces[20].id);
    expect(board.canPlaceTile(reserved)).is.false;
    expect(board.getNonReservedLandSpaces().some((s) => s.id === reserved.id)).is.false;
  });

  it('keeps bonuses, volcanic and reserved through serialize/deserialize', () => {
    const def = blankCustomBoard(9, 'Roundtrip');
    def.spaces[0].spaceType = SpaceType.OCEAN;
    def.spaces[5].volcanic = true;
    def.spaces[5].bonus = [SpaceBonus.PLANT, SpaceBonus.STEEL];
    def.spaces[6].reserved = true;

    const original = build(def);
    const players = [TestPlayer.BLUE.newPlayer(), TestPlayer.RED.newPlayer()];
    const deserialized = Board.deserialize(original.serialize(), players).spaces;
    const restored = new CustomBoard(deserialized, def.rows);

    expect(restored.getSpaceOrThrow(def.spaces[0].id).spaceType).eq(SpaceType.OCEAN);
    expect(restored.getSpaceOrThrow(def.spaces[5].id).volcanic).is.true;
    expect(restored.getSpaceOrThrow(def.spaces[5].id).bonus).to.deep.eq([SpaceBonus.PLANT, SpaceBonus.STEEL]);
    expect(restored.canPlaceTile(restored.getSpaceOrThrow(def.spaces[6].id))).is.false;
    expect(restored.getEdges().map((s) => s.id)).to.deep.eq(original.getEdges().map((s) => s.id));
  });
});
