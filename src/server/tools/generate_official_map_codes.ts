// Generates src/common/boards/officialMapLibrary.ts: a derived CustomBoardDefinition/TMB code
// for every built-in board -- official (Tharsis/Hellas/Elysium) and fan-made-but-bespoke-classed
// (Hollandia, Arabia Terra, etc.) alike -- used ONLY by the Map Library's listing/preview UI.
// Actual gameplay is untouched either way: "Play this map" on a built-in library row deep-links
// into Create Game with the real BoardName, never through this derived code (see the Map Library
// plan's "Open design question" for the rationale, and MapLibraryRow.vue's play() for how a row
// is recognized as built-in regardless of its official/fanmade origin tag).
//
// This is a one-time, manually-run generator, not part of the build or server boot. Board
// layouts change essentially never; re-run this by hand (`npx tsx
// src/server/tools/generate_official_map_codes.ts`) and commit the refreshed output on the rare
// occasion one does.
import {strict as assert} from 'assert';
import {writeFileSync} from 'fs';
import path from 'path';
// Priming the module graph through globalInitialize (as the test harness does) avoids a
// load-order-dependent circular-import crash between Board.ts and MoonBoard.ts that otherwise
// surfaces when this script is run directly as the tsx entry point.
import {globalInitialize} from '../globalInitialize';
globalInitialize();
import {BoardName} from '../../common/boards/BoardName';
import {SpaceName} from '../../common/boards/SpaceName';
import {SpaceType} from '../../common/boards/SpaceType';
import {DEFAULT_GAME_OPTIONS, GameOptions} from '../game/GameOptions';
import {GameSetup} from '../GameSetup';
import {SeededRandom} from '../../common/utils/Random';
import {CustomBoardDefinition, CustomSpaceDef, customSpaceId} from '../../common/boards/CustomBoardDefinition';
import {decodeCustomBoard, encodeCustomBoard, validateCustomBoard} from '../../common/boards/customBoardCodec';
import {awardManifest} from '../awards/Awards';
import {milestoneManifest} from '../milestones/Milestones';

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDefinition(boardName: BoardName, seed: number): CustomBoardDefinition {
  const gameOptions: GameOptions = {...DEFAULT_GAME_OPTIONS, boardName, shuffleMapOption: false};
  const board = GameSetup.newBoard(gameOptions, new SeededRandom(seed));

  const marsSpaces = board.spaces.filter((space) => space.spaceType !== SpaceType.COLONY);
  const spaces: Array<CustomSpaceDef> = marsSpaces.map((space, index) => {
    const spaceDef: CustomSpaceDef = {
      id: customSpaceId(index),
      x: space.x,
      y: space.y,
      spaceType: space.spaceType,
      bonus: [...space.bonus],
    };
    if (space.volcanic) {
      spaceDef.volcanic = true;
    }
    // Cosmetic-only, for the library preview: Noctis City has no real analog on a
    // CustomBoardDefinition (its no-reshuffle rule lives on MarsBoard, not on the space itself).
    if (boardName === BoardName.THARSIS && space.id === SpaceName.NOCTIS_CITY) {
      spaceDef.reserved = true;
    }
    return spaceDef;
  });

  return {
    version: 1,
    name: titleCase(boardName),
    rows: 9,
    spaces,
    milestones: [...milestoneManifest.boards[boardName]],
    awards: [...awardManifest.boards[boardName]],
  };
}

// The game's own, sole source of truth for "official" (Fryxgames-published) vs. fan/community
// board: ApiCreateGame.boardOptions(RandomBoardOption.OFFICIAL) hardcodes exactly these three.
// Every other BoardName is a fan-made board that happens to have a full bespoke board class (as
// opposed to a community member's arbitrary CustomBoardDefinition/TMB code) -- still worth
// generating a derived code for (so its Map Library row gets a real preview and deep-links to
// its real BoardName for gameplay, same as an official one), just tagged 'fanmade' instead.
const OFFICIAL_BOARD_NAMES: ReadonlySet<BoardName> = new Set([BoardName.THARSIS, BoardName.HELLAS, BoardName.ELYSIUM]);

function generate(): Array<{boardName: BoardName, code: string, official: boolean}> {
  const boardNames = Object.values(BoardName).filter((name) => name !== BoardName.CUSTOM);
  const results: Array<{boardName: BoardName, code: string, official: boolean}> = [];

  for (const boardName of boardNames) {
    const def = buildDefinition(boardName, 0);

    // Self-check #1: the code must decode back to exactly what was encoded.
    const code = encodeCustomBoard(def);
    assert.deepStrictEqual(decodeCustomBoard(code), def, `round-trip mismatch for ${boardName}`);

    // Self-check #2: nothing RNG-dependent leaked in (shuffleMapOption is off, so a different
    // seed must produce byte-for-byte the same definition).
    const defWithOtherSeed = buildDefinition(boardName, 12345);
    assert.deepStrictEqual(defWithOtherSeed, def, `non-deterministic output for ${boardName}`);

    const warnings = validateCustomBoard(def);
    if (warnings.length > 0) {
      console.log(`${boardName}: ${warnings.join(' ')}`);
    }

    results.push({boardName, code, official: OFFICIAL_BOARD_NAMES.has(boardName)});
  }
  return results;
}

function main() {
  const results = generate();
  const official = results.filter((r) => r.official);
  const fan = results.filter((r) => !r.official);

  const lines: Array<string> = [];
  lines.push('// GENERATED FILE -- do not hand-edit.');
  lines.push('// Regenerate with: npx tsx src/server/tools/generate_official_map_codes.ts');
  lines.push('//');
  lines.push('// Derived CustomBoardDefinition/TMB codes for every built-in board (official and fan-made');
  lines.push('// alike -- see OFFICIAL_BOARD_NAMES in generate_official_map_codes.ts for which is which),');
  lines.push("// used only by the Map Library's listing/preview UI. See generate_official_map_codes.ts for");
  lines.push('// how these are built and why gameplay never routes through the derived code itself.');
  lines.push("import {BoardName} from './BoardName';");
  lines.push("import {isMapLibraryEntryId, MapLibraryEntryId} from './MapLibraryEntry';");
  lines.push("import {safeCast} from '../Types';");
  lines.push('');
  lines.push('export const OFFICIAL_MAP_LIBRARY_BOARDS: ReadonlyArray<{boardName: BoardName, code: string}> = [');
  for (const {boardName, code} of official) {
    lines.push(`  {boardName: BoardName.${enumKeyFor(boardName)}, code: '${code}'},`);
  }
  lines.push('];');
  lines.push('');
  lines.push('// Fan-made boards with a full bespoke board class (unlike a community CustomBoardDefinition');
  lines.push('// submission) -- still real, "approved" Map Library entries, just not Fryxgames-official.');
  lines.push('export const FAN_MAP_LIBRARY_BOARDS: ReadonlyArray<{boardName: BoardName, code: string}> = [');
  for (const {boardName, code} of fan) {
    lines.push(`  {boardName: BoardName.${enumKeyFor(boardName)}, code: '${code}'},`);
  }
  lines.push('];');
  lines.push('');
  lines.push('// Stable, deterministic id shared by both lists above -- re-running the seeder is');
  lines.push('// idempotent, and an admin who deletes a built-in row will not have it silently');
  lines.push('// resurrected until the next boot.');
  lines.push('export function officialMapLibraryId(boardName: BoardName): MapLibraryEntryId {');
  lines.push('  const slug = boardName.toLowerCase().replace(/[^a-z0-9]+/g, \'-\').replace(/(^-|-$)/g, \'\');');
  lines.push('  return safeCast(`m-official-${slug}`, isMapLibraryEntryId);');
  lines.push('}');
  lines.push('');

  const outPath = path.resolve(__dirname, '../../common/boards/officialMapLibrary.ts');
  writeFileSync(outPath, lines.join('\n'));
  console.log(`Wrote ${official.length} official + ${fan.length} fan-made board codes to ${outPath}`);
}

function enumKeyFor(boardName: BoardName): string {
  const key = Object.entries(BoardName).find(([, value]) => value === boardName)?.[0];
  if (key === undefined) {
    throw new Error(`no BoardName enum key for value ${boardName}`);
  }
  return key;
}

main();
