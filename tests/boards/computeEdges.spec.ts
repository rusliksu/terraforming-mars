import {expect} from 'chai';
import {TharsisBoard} from '../../src/server/boards/TharsisBoard';
import {HellasBoard} from '../../src/server/boards/HellasBoard';
import {ElysiumBoard} from '../../src/server/boards/ElysiumBoard';
import {HollandiaBoard} from '../../src/server/boards/HollandiaBoard';
import {AmazonisBoard} from '../../src/server/boards/AmazonisBoard';
import {SpaceType} from '../../src/common/boards/SpaceType';
import {DEFAULT_GAME_OPTIONS} from '../../src/server/game/GameOptions';
import {SeededRandom} from '../../src/common/utils/Random';

// The old, hardcoded definition of a Tharsis-diamond edge, kept here to prove the
// adjacency-based `computeEdges()` produces exactly the same set on the standard boards.
function oldDiamondEdge(x: number, y: number): boolean {
  return y === 0 || y === 8 || x === 8 || y + x === 4 || y - x === 4;
}

describe('MarsBoard.computeEdges generalisation', () => {
  for (const Factory of [TharsisBoard, HellasBoard, ElysiumBoard, HollandiaBoard, AmazonisBoard]) {
    it(`${Factory.name} edges match the old diamond formula`, () => {
      const board = Factory.newInstance(DEFAULT_GAME_OPTIONS, new SeededRandom(0));
      const edges = new Set(board.getEdges().map((s) => s.id));
      for (const space of board.spaces) {
        if (space.spaceType === SpaceType.COLONY) {
          continue;
        }
        expect(edges.has(space.id)).to.eq(
          oldDiamondEdge(space.x, space.y),
          `${Factory.name} space ${space.id} at ${space.x},${space.y}`);
      }
    });
  }
});
