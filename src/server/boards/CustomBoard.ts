import {SpaceName} from '../../common/boards/SpaceName';
import {SpaceType} from '../../common/boards/SpaceType';
import {Space} from './Space';
import {MarsBoard} from './MarsBoard';
import {GameOptions} from '../game/GameOptions';
import {Random} from '../../common/utils/Random';
import {CustomBoardDefinition} from '../../common/boards/CustomBoardDefinition';
import {addExpansionColonySpaces, colonySpace} from './BoardBuilder';

/**
 * A board built from a user-authored `CustomBoardDefinition` (see `GameOptions.customBoard`),
 * rather than from a hand-written `MarsBoard` subclass. Supports arbitrary regular-hexagon
 * sizes and carved outlines.
 */
export class CustomBoard extends MarsBoard {
  public static newInstance(gameOptions: GameOptions, rng: Random): CustomBoard {
    const def = gameOptions.customBoard;
    if (def === undefined) {
      throw new Error('Custom board selected but no custom board definition was provided.');
    }
    return new CustomBoard(buildCustomSpaces(def, gameOptions, rng), def.rows);
  }

  public constructor(spaces: ReadonlyArray<Space>, rows?: number) {
    // A carved outline can leave the top or bottom row empty, which would move the
    // `computeAdjacentSpaces` middle-row pivot; anchor it to the intended row count.
    const marsSpaces = spaces.filter((s) => s.spaceType !== SpaceType.COLONY);
    const extent = rows !== undefined ?
      {maxX: rows - 1, maxY: rows - 1} :
      {
        maxX: Math.max(...marsSpaces.map((s) => s.x)),
        maxY: Math.max(...marsSpaces.map((s) => s.y)),
      };
    super(spaces, undefined, extent);
  }

  protected override isReservedSpace(space: Space): boolean {
    return space.reserved === true || super.isReservedSpace(space);
  }

  public override getSpaces(spaceType: SpaceType): Array<Space> {
    switch (spaceType) {
    case SpaceType.LAND:
      // Deflection zones count as land (Hollandia); coves count as both land and ocean
      // (Arabia Terra).
      return this.spaces.filter((s) =>
        s.spaceType === SpaceType.LAND ||
        s.spaceType === SpaceType.DEFLECTION_ZONE ||
        s.spaceType === SpaceType.COVE);
    case SpaceType.OCEAN:
      return this.spaces.filter((s) => s.spaceType === SpaceType.OCEAN || s.spaceType === SpaceType.COVE);
    default:
      return this.spaces.filter((s) => s.spaceType === spaceType);
    }
  }
}

function buildCustomSpaces(def: CustomBoardDefinition, gameOptions: GameOptions, _rng: Random): Array<Space> {
  const spaces: Array<Space> = [
    colonySpace(SpaceName.GANYMEDE_COLONY),
    colonySpace(SpaceName.PHOBOS_SPACE_HAVEN),
  ];

  for (const s of def.spaces) {
    const space: Space = {id: s.id, spaceType: s.spaceType, x: s.x, y: s.y, bonus: [...s.bonus]};
    if (s.volcanic) {
      space.volcanic = true;
    }
    if (s.reserved) {
      space.reserved = true;
    }
    spaces.push(space);
  }

  addExpansionColonySpaces(spaces, gameOptions);
  return spaces;
}
