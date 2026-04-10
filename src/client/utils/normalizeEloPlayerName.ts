const ELO_PLAYER_NAME_ALIASES: Record<string, string> = {
  'лёха': 'алексей',
  'леха': 'алексей',
  'genuinegold': 'илья',
  'rav': 'рав',
  'равиль': 'рав',
};

export function normalizeEloPlayerName(name: string): string {
  const raw = (name || '').trim().toLowerCase();
  return ELO_PLAYER_NAME_ALIASES[raw] ?? raw;
}
