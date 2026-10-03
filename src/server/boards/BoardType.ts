export const BoardType = {
  MARS: 'mars',
  MOON: 'moon',
  VENUS: 'venus',
} as const;
export type BoardType = typeof BoardType[keyof typeof BoardType];
