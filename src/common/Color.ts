export const DEFAULT_PLAYER_COLORS = ['red', 'green', 'yellow', 'blue', 'black', 'purple', 'orange', 'pink'] as const;
export const GENUINE_GOLD_COLOR = 'gold' as const;
export const GENUINE_GOLD_NAME = 'GenuineGold';
export const EMERALD_RAV_COLOR = 'emerald' as const;
export const EMERALD_RAV_NAME = 'Рав';
export const CATHARSIS_COLOR = 'ginger' as const;
export const CATHARSIS_NAME = 'Catharsis🔥';
export const GYDRO_COLOR = 'hydro' as const;
export const GYDRO_NAME = 'GydRo';
export const ANTISTRESS_COLOR = 'antistress' as const;
export const ANTISTRESS_NAME = 'Антистресс';
export const GAMBIT_GIRL_COLOR = 'gambit' as const;
export const GAMBIT_GIRL_NAME = 'GambitGirl';
export const RESERVED_PLAYER_COLORS = [
  GENUINE_GOLD_COLOR,
  EMERALD_RAV_COLOR,
  CATHARSIS_COLOR,
  GYDRO_COLOR,
  ANTISTRESS_COLOR,
  GAMBIT_GIRL_COLOR,
] as const;
export const PLAYER_COLORS = [...DEFAULT_PLAYER_COLORS, ...RESERVED_PLAYER_COLORS] as const;
export type PlayerColor = typeof PLAYER_COLORS[number];
const ALL_COLORS = [...PLAYER_COLORS, 'neutral', 'bronze'] as const;
export type Color = typeof ALL_COLORS[number];
export type ColorWithNeutral = Color | 'NEUTRAL';

export type LockedPlayerIdentity = {
  color: PlayerColor;
  name: string;
  shortLabel: string;
  title: string;
  aliases: ReadonlyArray<string>;
};

export const LOCKED_PLAYER_IDENTITIES: ReadonlyArray<LockedPlayerIdentity> = [
  {
    color: GENUINE_GOLD_COLOR,
    name: GENUINE_GOLD_NAME,
    shortLabel: 'GG',
    title: 'GenuineGold - reserved gold',
    aliases: ['genuinegold', 'илья', 'ilya', 'золотинский'],
  },
  {
    color: EMERALD_RAV_COLOR,
    name: EMERALD_RAV_NAME,
    shortLabel: 'Рав',
    title: 'Рав - reserved emerald',
    aliases: ['изумрудный рав', 'rav', 'рав', 'равиль'],
  },
  {
    color: CATHARSIS_COLOR,
    name: CATHARSIS_NAME,
    shortLabel: 'Cath',
    title: 'Catharsis with flame - reserved ginger',
    aliases: ['catharsis', 'catharsis🔥', 'катерина', 'воложанина'],
  },
  {
    color: GYDRO_COLOR,
    name: GYDRO_NAME,
    shortLabel: 'GydRo',
    title: 'GydRo - reserved Mars red',
    aliases: ['gydro', 'руслан', 'ruslan'],
  },
  {
    color: ANTISTRESS_COLOR,
    name: ANTISTRESS_NAME,
    shortLabel: 'Anti',
    title: 'Антистресс - reserved deep calm blue',
    aliases: ['antistress', 'anti stress', 'антистресс', 'анатолий', 'абдуллаев'],
  },
  {
    color: GAMBIT_GIRL_COLOR,
    name: GAMBIT_GIRL_NAME,
    shortLabel: 'Gambit',
    title: 'GambitGirl - reserved hydrangea blue',
    aliases: ['gambitgirl', 'gambit girl', 'олеся', 'игнатова', 'мяу'],
  },
];

export function getLockedPlayerIdentity(color: Color): LockedPlayerIdentity | undefined {
  return LOCKED_PLAYER_IDENTITIES.find((identity) => identity.color === color);
}

export function getLockedPlayerName(color: Color): string | undefined {
  return getLockedPlayerIdentity(color)?.name;
}

export function isReservedPlayerColor(color: Color): color is typeof RESERVED_PLAYER_COLORS[number] {
  return RESERVED_PLAYER_COLORS.includes(color as typeof RESERVED_PLAYER_COLORS[number]);
}

export function normalizePlayerNameForColor(color: Color, name: string): string {
  return getLockedPlayerName(color) ?? name;
}

export function getPlayerIdentityByName(name: string): LockedPlayerIdentity | undefined {
  const normalized = (name || '').trim().toLowerCase();
  if (normalized === '') return undefined;
  return LOCKED_PLAYER_IDENTITIES.find((identity) =>
    identity.name.trim().toLowerCase() === normalized || identity.aliases.includes(normalized));
}
