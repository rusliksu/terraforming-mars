/**
 * Adds `days` days to `date`. `days` can be negative.
 * Kept outside the database package so the engine can use it without
 * transitively importing a persistence implementation.
 */
export function addDays(date: Date, days: number): Date {
  const ms = Math.round(date.getTime());
  const daysInMs = days * 86400 * 1000;
  return new Date(ms + daysInMs);
}

export function stringToNumber(s: string | undefined, defaultValue: number): number {
  const parsed = parseInt(s || '');
  return Number.isInteger(parsed) ? parsed : defaultValue;
}
