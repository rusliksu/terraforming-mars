import fs from 'fs';
import path from 'path';
import {DEFAULT_PLAYER_COLORS, LOCKED_PLAYER_IDENTITIES} from '../common/Color';

type RgbColor = {
  name: string;
  red: number;
  green: number;
  blue: number;
  hex: string;
};

type LabColor = {
  lightness: number;
  a: number;
  b: number;
};

type DistanceRow = {
  name: string;
  hex: string;
  distance: number;
};

type Options = {
  threshold: number;
  nearest: number;
  target?: string;
  selectableOnly: boolean;
  fail: boolean;
};

const IGNORE_SUFFIXES = [
  '_dark',
  '_delegate_filter',
  '_fleet_filter',
  '_light',
  '_sprite_filter',
  '_token_gradient',
];

function parseArgs(args: Array<string>): Options {
  const options: Options = {
    threshold: 10,
    nearest: 6,
    selectableOnly: false,
    fail: false,
  };

  for (let idx = 0; idx < args.length; idx++) {
    const arg = args[idx];
    switch (arg) {
    case '--threshold':
      options.threshold = Number(args[++idx]);
      break;
    case '--nearest':
      options.nearest = Number(args[++idx]);
      break;
    case '--target':
      options.target = args[++idx];
      break;
    case '--selectable-only':
      options.selectableOnly = true;
      break;
    case '--fail':
      options.fail = true;
      break;
    case '--help':
      return printUsageAndExit();
    default:
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(options.threshold) || options.threshold <= 0) {
    throw new Error('--threshold must be a positive number');
  }
  if (!Number.isInteger(options.nearest) || options.nearest <= 0) {
    throw new Error('--nearest must be a positive integer');
  }
  return options;
}

function printUsageAndExit(): never {
  printUsage();
  process.exit(0);
}

function printUsage() {
  console.log([
    'Usage: npx tsx src/tools/check_player_color_distances.ts [options]',
    '',
    'Options:',
    '  --target <text>      Only print nearest-neighbor tables for matching color names',
    '  --selectable-only    Only include colors selectable in the Create Game persona UI',
    '  --threshold <number> Report close pairs at or below this OKLab distance (default: 10)',
    '  --nearest <number>   Rows per nearest-neighbor table (default: 6)',
    '  --fail               Exit 1 when any close pair is found',
  ].join('\n'));
}

function toHex(red: number, green: number, blue: number): string {
  return '#' + [red, green, blue]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function parseHexColor(hex: string): RgbColor {
  const normalized = hex.replace('#', '');
  return {
    name: '',
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
    hex: `#${normalized.toUpperCase()}`,
  };
}

function readPlayerColors(): Array<RgbColor> {
  const variablesPath = path.resolve('src/styles/variables.less');
  const content = fs.readFileSync(variablesPath, 'utf8');
  const pattern = /@player_([a-z0-9_]+):\s*(?:rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)|(#(?:[0-9a-fA-F]{6})))/g;
  const colors: Array<RgbColor> = [];

  for (const match of content.matchAll(pattern)) {
    const name = match[1];
    if (IGNORE_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
      continue;
    }

    let color: RgbColor;
    if (match[5] !== undefined) {
      color = parseHexColor(match[5]);
    } else {
      const red = Number.parseInt(match[2], 10);
      const green = Number.parseInt(match[3], 10);
      const blue = Number.parseInt(match[4], 10);
      color = {
        name: '',
        red,
        green,
        blue,
        hex: toHex(red, green, blue),
      };
    }

    colors.push({...color, name});
  }

  return colors;
}

function selectableColorNames(): Set<string> {
  const names = new Set<string>(DEFAULT_PLAYER_COLORS);
  for (const identity of LOCKED_PLAYER_IDENTITIES) {
    if (identity.selectable !== false) {
      names.add(identity.color);
    }
  }
  return names;
}

function srgbToLinear(value: number): number {
  const normalized = value / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function cbrt(value: number): number {
  return Math.sign(value) * Math.pow(Math.abs(value), 1 / 3);
}

function toOklab(color: RgbColor): LabColor {
  const red = srgbToLinear(color.red);
  const green = srgbToLinear(color.green);
  const blue = srgbToLinear(color.blue);

  const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
  const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
  const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;

  const lRoot = cbrt(l);
  const mRoot = cbrt(m);
  const sRoot = cbrt(s);

  return {
    lightness: 0.2104542553 * lRoot + 0.7936177850 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot,
  };
}

function distance(first: LabColor, second: LabColor): number {
  return Math.sqrt(
    Math.pow((first.lightness - second.lightness) * 100, 2) +
    Math.pow((first.a - second.a) * 100, 2) +
    Math.pow((first.b - second.b) * 100, 2),
  );
}

function formatDistance(value: number): string {
  return value.toFixed(2).padStart(6, ' ');
}

function buildDistances(colors: Array<RgbColor>): Map<string, Array<DistanceRow>> {
  const labs = new Map(colors.map((color) => [color.name, toOklab(color)]));
  const result = new Map<string, Array<DistanceRow>>();

  for (const color of colors) {
    const rows: Array<DistanceRow> = [];
    const colorLab = labs.get(color.name);
    if (colorLab === undefined) {
      continue;
    }
    for (const other of colors) {
      if (other.name === color.name) {
        continue;
      }
      const otherLab = labs.get(other.name);
      if (otherLab === undefined) {
        continue;
      }
      rows.push({
        name: other.name,
        hex: other.hex,
        distance: distance(colorLab, otherLab),
      });
    }
    rows.sort((first, second) => first.distance - second.distance);
    result.set(color.name, rows);
  }

  return result;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let colors = readPlayerColors();
  if (options.selectableOnly) {
    const selectable = selectableColorNames();
    colors = colors.filter((color) => selectable.has(color.name));
  }
  const distances = buildDistances(colors);
  const target = options.target?.toLowerCase();
  const printedColors = colors.filter((color) => target === undefined || color.name.includes(target));

  if (printedColors.length === 0) {
    throw new Error(`No player colors matched target: ${options.target}`);
  }

  console.log(`Color set: ${options.selectableOnly ? 'selectable' : 'all'} (${colors.length})`);
  for (const color of printedColors) {
    console.log(`\n${color.name} ${color.hex}`);
    for (const row of (distances.get(color.name) ?? []).slice(0, options.nearest)) {
      console.log(`  ${formatDistance(row.distance)}  ${row.name.padEnd(18)} ${row.hex}`);
    }
  }

  const closePairs: Array<{first: RgbColor; second: RgbColor; distance: number}> = [];
  for (let firstIdx = 0; firstIdx < colors.length; firstIdx++) {
    for (let secondIdx = firstIdx + 1; secondIdx < colors.length; secondIdx++) {
      const first = colors[firstIdx];
      const second = colors[secondIdx];
      const rows = distances.get(first.name) ?? [];
      const found = rows.find((row) => row.name === second.name);
      if (found !== undefined && found.distance <= options.threshold) {
        closePairs.push({first, second, distance: found.distance});
      }
    }
  }

  closePairs.sort((first, second) => first.distance - second.distance);
  console.log(`\nClose pairs <= ${options.threshold}: ${closePairs.length}`);
  for (const pair of closePairs) {
    console.log(
      `  ${formatDistance(pair.distance)}  ${pair.first.name.padEnd(18)} ${pair.first.hex}  ` +
      `${pair.second.name.padEnd(18)} ${pair.second.hex}`,
    );
  }

  if (options.fail && closePairs.length > 0) {
    process.exitCode = 1;
  }
}

main();
