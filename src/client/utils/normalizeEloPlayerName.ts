import eloPlayerNameAliases from '../../../elo/player_name_aliases.json';

const ELO_PLAYER_NAME_ALIASES = eloPlayerNameAliases as Record<string, string>;

export function normalizeEloPlayerName(name: string): string {
  const raw = (name || '').trim().toLowerCase();
  return (ELO_PLAYER_NAME_ALIASES[raw] ?? raw).toLowerCase();
}

export function hasEloPlayerNameAlias(name: string): boolean {
  const raw = (name || '').trim().toLowerCase();
  return ELO_PLAYER_NAME_ALIASES[raw] !== undefined;
}
