import {paths} from '@/common/app/paths';
import {statusCode} from '@/common/http/statusCode';

export function getLoadErrorMessage(path: typeof paths.GAME | typeof paths.PLAYER | typeof paths.SPECTATOR, status: number): string {
  if (path === paths.PLAYER && status === statusCode.forbidden) {
    return 'This player link is password-protected. Ask the player for their current link.';
  }
  if (status !== statusCode.notFound) {
    return 'Error getting game data';
  }
  if (path === paths.GAME) {
    return 'Game not found. This game link may be old, invalid, or purged. Use a player link or ask for a fresh game link.';
  }
  if (path === paths.PLAYER) {
    return 'Player not found. This player link may be old, invalid, or purged. Ask for a fresh player link.';
  }
  return 'Spectator not found. This spectator link may be old, invalid, or purged. Ask for a fresh spectator link.';
}
