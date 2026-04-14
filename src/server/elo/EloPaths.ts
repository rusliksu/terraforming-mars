import * as path from 'path';

export function getEloDirectory(): string {
  return path.resolve(process.env.ELO_DATA_DIR ?? 'assets/elo');
}

export function getEloPrimaryPath(): string {
  return path.join(getEloDirectory(), 'data.json');
}

export function getEloMirrorPath(): string {
  return path.join(getEloDirectory(), 'elo-data.json');
}

export function resolveEloAssetPath(urlPath: string): string | undefined {
  switch (urlPath) {
  case 'elo/data.json':
    return getEloPrimaryPath();
  case 'elo/elo-data.json':
    return getEloMirrorPath();
  default:
    return undefined;
  }
}

export function isDynamicEloAssetPath(urlPath: string): boolean {
  return resolveEloAssetPath(urlPath) !== undefined;
}
