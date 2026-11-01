// Bot accounts and throwaway test line-ups must never reach the ratings or the public statistics.
// ELO sync, the statistics projection and the maintenance clean-up all use these predicates, so a
// benchmark run that joins as a "human" account cannot pollute the public numbers again.

const BOT_ACCOUNT = /^(bot|ai|smartbot|shadowbot|shadow bot)([ _-]|$)/i;
const TEST_ACCOUNT = /^(player[-_ ][a-z]+|player\d+|[abc])$/i;

function normalized(name: string | undefined): string {
  return (name ?? '').trim();
}

/** An automated account, e.g. "Bot Vega" or "bot orion". */
export function isBotPlayerName(name: string | undefined): boolean {
  const trimmed = normalized(name);
  return trimmed !== '' && BOT_ACCOUNT.test(trimmed);
}

/** A placeholder account from a test/benchmark line-up, e.g. "player-blue", "player1" or "a". */
export function isTestPlayerName(name: string | undefined): boolean {
  const trimmed = normalized(name);
  return trimmed !== '' && TEST_ACCOUNT.test(trimmed);
}

export function isNonHumanPlayerName(name: string | undefined): boolean {
  return isBotPlayerName(name) || isTestPlayerName(name);
}

/** A line-up of nothing but test placeholders ("a"/"b"/"c"): a game that no human ever played. */
export function isSyntheticPlayerLineup(names: ReadonlyArray<string | undefined>): boolean {
  const present = names.map(normalized).filter((name) => name !== '');
  return present.length > 0 && present.every((name) => TEST_ACCOUNT.test(name));
}
