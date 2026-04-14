export const DEFAULT_PLAYER_COLORS = ['red', 'green', 'yellow', 'blue', 'black', 'purple', 'orange', 'pink'] as const;
export const GENUINE_GOLD_COLOR = 'gold' as const;
export const GENUINE_GOLD_NAME = 'GenuineGold';
export const PLAYER_COLORS = [...DEFAULT_PLAYER_COLORS, GENUINE_GOLD_COLOR] as const;
const ALL_COLORS = [...PLAYER_COLORS, 'neutral', 'bronze'] as const;
export type Color = typeof ALL_COLORS[number];
export type ColorWithNeutral = Color | 'NEUTRAL';

export function getLockedPlayerName(color: Color): string | undefined {
  return color === GENUINE_GOLD_COLOR ? GENUINE_GOLD_NAME : undefined;
}

export function normalizePlayerNameForColor(color: Color, name: string): string {
  return getLockedPlayerName(color) ?? name;
}
