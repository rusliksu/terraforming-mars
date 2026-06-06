import {Color, DEFAULT_PLAYER_COLORS} from './Color';
import eloPlayerNameAliases from '../../elo/player_name_aliases.json';

export type PlayerProfile = {
  id: string;
  name: string;
  preferredColor: Color;
  aliases: ReadonlyArray<string>;
};

export type EloProfileEntry = {
  displayName?: string;
  games?: number;
  elo?: number;
};

const ELO_PLAYER_NAME_ALIASES = eloPlayerNameAliases as Record<string, string>;

export const PLAYER_PROFILES: ReadonlyArray<PlayerProfile> = [
  {
    id: 'leha',
    name: 'Леха',
    preferredColor: 'orange',
    aliases: ['лёха', 'леха', 'лёха инженер', 'леха инженер', 'асмо', 'asmo'],
  },
  {
    id: 'alexey',
    name: 'Алексей',
    preferredColor: 'yellow',
    aliases: ['алексей', 'алексей часовщик', 'часовщик', 'алексей константинов', 'константинов алексей'],
  },
  {
    id: 'vvbminsk',
    name: 'vvbMinsk',
    preferredColor: 'green',
    aliases: ['vvb', 'vvbminsk', 'minsk', 'минск', 'евгений', 'женя'],
  },
  {
    id: 'nuke',
    name: 'Nuke',
    preferredColor: 'purple',
    aliases: ['nuke', 'midilo', 'midilobusim', 'никита'],
  },
];

function normalizeProfileName(name: string): string {
  return (name || '').trim().toLowerCase();
}

function canonicalizeProfileName(name: string): string {
  const raw = normalizeProfileName(name);
  return ELO_PLAYER_NAME_ALIASES[raw] ?? (name || '').trim();
}

function uniqueAliases(aliases: Array<string>): ReadonlyArray<string> {
  return [...new Set(aliases
    .map((alias) => normalizeProfileName(alias))
    .filter((alias) => alias !== ''))];
}

function getAliasesForProfileName(name: string, seed?: PlayerProfile): ReadonlyArray<string> {
  const normalizedName = normalizeProfileName(name);
  const aliases = [...(seed?.aliases ?? [])];
  for (const [alias, canonicalName] of Object.entries(ELO_PLAYER_NAME_ALIASES)) {
    if (normalizeProfileName(canonicalName) === normalizedName) {
      aliases.push(alias);
    }
  }
  return uniqueAliases(aliases);
}

function getSeedProfile(name: string): PlayerProfile | undefined {
  const normalizedName = normalizeProfileName(name);
  return PLAYER_PROFILES.find((profile) => normalizeProfileName(profile.name) === normalizedName);
}

export function buildPlayerProfilesFromEloPlayers(eloPlayers: Record<string, EloProfileEntry>): ReadonlyArray<PlayerProfile> {
  const activePlayers = new Map<string, Required<Pick<EloProfileEntry, 'displayName'>> & Pick<EloProfileEntry, 'elo' | 'games'>>();

  for (const entry of Object.values(eloPlayers)) {
    const games = Number(entry.games ?? 0);
    if (games <= 0 || !entry.displayName || entry.displayName.trim() === '') {
      continue;
    }
    const displayName = canonicalizeProfileName(entry.displayName);
    const normalizedName = normalizeProfileName(displayName);
    const existing = activePlayers.get(normalizedName);
    if (
      existing === undefined ||
      Number(entry.elo ?? 0) > Number(existing.elo ?? 0) ||
      (Number(entry.elo ?? 0) === Number(existing.elo ?? 0) && games > Number(existing.games ?? 0))
    ) {
      activePlayers.set(normalizedName, {displayName, elo: entry.elo, games});
    }
  }

  return [...activePlayers.values()]
    .sort((a, b) => {
      const eloDelta = Number(b.elo ?? 0) - Number(a.elo ?? 0);
      if (eloDelta !== 0) {
        return eloDelta;
      }
      return a.displayName.localeCompare(b.displayName);
    })
    .map((entry, index) => {
      const seed = getSeedProfile(entry.displayName);
      return {
        id: seed?.id ?? normalizeProfileName(entry.displayName),
        name: entry.displayName,
        preferredColor: seed?.preferredColor ?? DEFAULT_PLAYER_COLORS[index % DEFAULT_PLAYER_COLORS.length],
        aliases: getAliasesForProfileName(entry.displayName, seed),
      };
    });
}

export function getPlayerProfileById(id: string, profiles: ReadonlyArray<PlayerProfile> = PLAYER_PROFILES): PlayerProfile | undefined {
  return profiles.find((profile) => profile.id === id);
}

export function getPlayerProfileByName(name: string, profiles: ReadonlyArray<PlayerProfile> = PLAYER_PROFILES): PlayerProfile | undefined {
  const normalized = normalizeProfileName(name);
  if (normalized === '') {
    return undefined;
  }
  return profiles.find((profile) =>
    normalizeProfileName(profile.name) === normalized ||
    profile.aliases.includes(normalized));
}
