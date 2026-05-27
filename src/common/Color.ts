export const DEFAULT_PLAYER_COLORS = ['red', 'green', 'yellow', 'blue', 'black', 'purple', 'orange', 'pink'] as const;
export const GENUINE_GOLD_COLOR = 'gold' as const;
export const GENUINE_GOLD_NAME = 'GenuineGold';
export const EMERALD_RAV_COLOR = 'emerald' as const;
export const EMERALD_RAV_NAME = 'Рав';
export const CATHARSIS_COLOR = 'ginger' as const;
export const CATHARSIS_NAME = 'Catharsis🔥';
export const GYDRO_COLOR = 'pearl' as const;
export const GYDRO_NAME = 'GydRo';
export const ANTISTRESS_COLOR = 'antistress' as const;
export const ANTISTRESS_NAME = 'Антистресс';
export const GAMBIT_GIRL_COLOR = 'gambit' as const;
export const GAMBIT_GIRL_NAME = 'GambitGirl';
export const PAVEL_TURQUOISE_COLOR = 'turquoise' as const;
export const PAVEL_TURQUOISE_NAME = 'Паша';
export const VANGER_COLOR = 'vanger' as const;
export const VANGER_NAME = 'Вангер';
export const SERGE_COLOR = 'serge' as const;
export const SERGE_NAME = 'Serge';
export const TOMA_NAME = 'Тома';
export const SONYA_EMKO_NAME = TOMA_NAME;
export const SONYA_HYDRO_COLOR = 'hydro' as const;
export const SONYA_SATURN_COLOR = 'saturn' as const;
export const SONYA_SATURN_RINGS_COLOR = 'saturnrings' as const;
export const SONYA_TITAN_COLOR = 'titan' as const;
export const SONYA_SATURN_STORM_COLOR = 'saturnstorm' as const;
export const SONYA_CATSEYE_COLOR = 'catseye' as const;
export const RESERVED_PLAYER_COLORS = [
  GENUINE_GOLD_COLOR,
  EMERALD_RAV_COLOR,
  CATHARSIS_COLOR,
  GYDRO_COLOR,
  ANTISTRESS_COLOR,
  GAMBIT_GIRL_COLOR,
  PAVEL_TURQUOISE_COLOR,
  VANGER_COLOR,
  SERGE_COLOR,
  SONYA_HYDRO_COLOR,
  SONYA_SATURN_COLOR,
  SONYA_SATURN_RINGS_COLOR,
  SONYA_TITAN_COLOR,
  SONYA_SATURN_STORM_COLOR,
  SONYA_CATSEYE_COLOR,
] as const;
export const PLAYER_COLORS = [...DEFAULT_PLAYER_COLORS, ...RESERVED_PLAYER_COLORS] as const;
export type PlayerColor = typeof PLAYER_COLORS[number];
const ALL_COLORS = [...PLAYER_COLORS, 'neutral', 'bronze'] as const;
export type Color = typeof ALL_COLORS[number];
export type ColorWithNeutral = Color | 'NEUTRAL';

export type LockedPlayerIdentity = {
  color: PlayerColor;
  name: string;
  label?: string;
  colorLabel: string;
  selectable?: boolean;
  shortLabel: string;
  title: string;
  aliases: ReadonlyArray<string>;
};

export const LOCKED_PLAYER_IDENTITIES: ReadonlyArray<LockedPlayerIdentity> = [
  {
    color: GENUINE_GOLD_COLOR,
    name: GENUINE_GOLD_NAME,
    colorLabel: 'золото',
    shortLabel: 'GG',
    title: 'GenuineGold - reserved gold',
    aliases: ['genuinegold', 'genuine gold', 'илья', 'ilya', 'золотинский'],
  },
  {
    color: EMERALD_RAV_COLOR,
    name: EMERALD_RAV_NAME,
    colorLabel: 'изумруд',
    shortLabel: 'Рав',
    title: 'Рав - reserved emerald',
    aliases: ['изумрудный рав', 'rav', 'рав', 'равиль'],
  },
  {
    color: CATHARSIS_COLOR,
    name: CATHARSIS_NAME,
    colorLabel: 'рыжий',
    shortLabel: 'Cath',
    title: 'Catharsis with flame - reserved ginger',
    aliases: ['catharsis', 'catharsis🔥', 'катерина', 'воложанина'],
  },
  {
    color: GYDRO_COLOR,
    name: GYDRO_NAME,
    colorLabel: 'перламутр',
    shortLabel: 'GydRo',
    title: 'GydRo - reserved pearl',
    aliases: ['gydro', 'руслан', 'ruslan', 'руслан гаянов', 'ruslan gayanov', 'гаянов', 'gayanov'],
  },
  {
    color: ANTISTRESS_COLOR,
    name: ANTISTRESS_NAME,
    colorLabel: 'тёмно-синий',
    shortLabel: 'Anti',
    title: 'Антистресс - reserved deep calm blue',
    aliases: ['antistress', 'anti stress', 'антистресс', 'анатолий', 'абдуллаев'],
  },
  {
    color: GAMBIT_GIRL_COLOR,
    name: GAMBIT_GIRL_NAME,
    colorLabel: 'гортензия',
    shortLabel: 'GG',
    title: 'GambitGirl - reserved hydrangea blue',
    aliases: ['gambitgirl', 'gambit girl', 'олеся', 'олеся игнатова', 'olesya', 'olesia', 'olesya ignatova', 'olesia ignatova', 'игнатова', 'мяу', 'мяу!', 'настроение: мяу!'],
  },
  {
    color: PAVEL_TURQUOISE_COLOR,
    name: PAVEL_TURQUOISE_NAME,
    colorLabel: 'коралл',
    shortLabel: 'Паша',
    title: 'Паша - reserved coral',
    aliases: ['паша', 'павел', 'миронов', 'pasha', 'pavel', 'pavel mironov'],
  },
  {
    color: VANGER_COLOR,
    name: VANGER_NAME,
    colorLabel: 'зелёный',
    shortLabel: 'Вангер',
    title: 'Вангер - reserved green',
    aliases: ['вангер', 'vanger', 'вангер думов', 'vanger dumov', 'думов', 'dumov'],
  },
  {
    color: SERGE_COLOR,
    name: SERGE_NAME,
    colorLabel: 'бордовый',
    shortLabel: 'Serge',
    title: 'Serge - reserved deep burgundy',
    aliases: ['serge', 'sergey', 'sergei', 'серж', 'сергей'],
  },
  {
    color: SONYA_HYDRO_COLOR,
    name: TOMA_NAME,
    label: 'Тома',
    colorLabel: 'кораллово-розовый',
    shortLabel: 'Тома',
    title: 'Тома - reserved coral pink',
    aliases: ['тома', 'toma', 'соня', 'sonya', 'соня эмко', 'эмко', 'sonya emko', 'sonia emko', 'emko'],
  },
  {
    color: SONYA_SATURN_COLOR,
    name: TOMA_NAME,
    label: 'Тома · Сатурн',
    colorLabel: 'сатурн',
    selectable: false,
    shortLabel: 'Sat',
    title: 'Тома - reserved Saturn dusty gold',
    aliases: ['соня сатурн', 'emko saturn', 'sonya saturn', 'sonia saturn'],
  },
  {
    color: SONYA_SATURN_RINGS_COLOR,
    name: TOMA_NAME,
    label: 'Тома · Кольца Сатурна',
    colorLabel: 'кольца',
    selectable: false,
    shortLabel: 'Ring',
    title: 'Тома - reserved Saturn rings',
    aliases: ['соня кольца', 'соня кольца сатурна', 'emko rings', 'sonya rings', 'sonia rings', 'sonya saturn rings', 'sonia saturn rings'],
  },
  {
    color: SONYA_TITAN_COLOR,
    name: TOMA_NAME,
    label: 'Тома · Титан',
    colorLabel: 'титан',
    selectable: false,
    shortLabel: 'Titan',
    title: 'Тома - reserved Titan ochre',
    aliases: ['соня титан', 'emko titan', 'sonya titan', 'sonia titan'],
  },
  {
    color: SONYA_SATURN_STORM_COLOR,
    name: TOMA_NAME,
    label: 'Тома · Старый красно-розовый',
    colorLabel: 'красно-розовый',
    selectable: false,
    shortLabel: 'Storm',
    title: 'Тома - reserved red-pink',
    aliases: ['соня шторм', 'соня сатурновый шторм', 'соня сатурн систем', 'сатурн систем', 'saturn systems', 'emko storm', 'sonya storm', 'sonia storm'],
  },
  {
    color: SONYA_CATSEYE_COLOR,
    name: TOMA_NAME,
    label: 'Тома · Кошачий глаз',
    colorLabel: 'кошачий глаз',
    selectable: false,
    shortLabel: 'Cat',
    title: 'Тома - reserved microbe cat eye',
    aliases: ['соня кошачий глаз', 'эмко кошачий глаз', 'cat eye microbe', 'microbe cat eye', 'sonya cat eye', 'sonia cat eye'],
  },
];

export function getLockedPlayerIdentity(color: Color): LockedPlayerIdentity | undefined {
  return LOCKED_PLAYER_IDENTITIES.find((identity) => identity.color === color);
}

export function getLockedPlayerName(color: Color): string | undefined {
  return getLockedPlayerIdentity(color)?.name;
}

export function getLockedPlayerLabel(color: Color): string | undefined {
  const identity = getLockedPlayerIdentity(color);
  return identity?.label ?? identity?.name;
}

export function isReservedPlayerColor(color: Color): color is typeof RESERVED_PLAYER_COLORS[number] {
  return RESERVED_PLAYER_COLORS.includes(color as typeof RESERVED_PLAYER_COLORS[number]);
}

export function normalizePlayerNameForColor(color: Color, name: string): string {
  const identityFromName = getPlayerIdentityByName(name);
  if (color === SONYA_HYDRO_COLOR && identityFromName?.name === GYDRO_NAME) {
    return GYDRO_NAME;
  }
  return getLockedPlayerName(color) ?? name;
}

export function getPlayerIdentityByName(name: string): LockedPlayerIdentity | undefined {
  const normalized = (name || '').trim().toLowerCase();
  if (normalized === '') {
    return undefined;
  }
  const aliasMatch = LOCKED_PLAYER_IDENTITIES.find((identity) => identity.aliases.includes(normalized));
  if (aliasMatch !== undefined) {
    return aliasMatch;
  }
  return LOCKED_PLAYER_IDENTITIES.find((identity) =>
    identity.selectable !== false && identity.name.trim().toLowerCase() === normalized) ??
    LOCKED_PLAYER_IDENTITIES.find((identity) => identity.name.trim().toLowerCase() === normalized);
}
