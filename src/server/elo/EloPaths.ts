import * as path from 'path';

export function getEloDirectory(): string {
  return path.resolve(process.env.ELO_DATA_DIR ?? 'elo');
}

export function getEloIndexPath(): string {
  return path.resolve(process.env.ELO_PAGE_DIR ?? 'elo', 'index.html');
}

export function getEloPrimaryPath(): string {
  return path.join(getEloDirectory(), 'data.json');
}

export function getEloMirrorPath(): string {
  return path.join(getEloDirectory(), 'elo-data.json');
}

export function resolveEloAssetPath(urlPath: string): string | undefined {
  switch (urlPath) {
  case 'elo':
  case 'elo/':
  case 'elo/index.html':
    return getEloIndexPath();
  case 'elo/data.json':
    return getEloPrimaryPath();
  case 'elo/elo-data.json':
    return getEloMirrorPath();
  default:
    return undefined;
  }
}

export function isDynamicEloAssetPath(urlPath: string): boolean {
  return urlPath === 'elo/data.json' || urlPath === 'elo/elo-data.json';
}
