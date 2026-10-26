import {EscapeVelocityOptions} from '@/common/game/NewGameConfig';

// Escape Velocity in the player row: used thinking time against the allowed time and the VP penalty once over.
// Penalty is supplied by our public model; this view only formats time and progress.
export type EscapeVelocityState = {
  usedMs: number;
  limitMs: number;
  // Share of the allowed time used, 0..1 (for the bar)
  share: number;
  over: boolean;
  penalty: number;
};

export function escapeVelocityState(usedMs: number, actionsTaken: number, options: EscapeVelocityOptions, penalty: number): EscapeVelocityState {
  const limitMs = (options.thresholdMinutes + actionsTaken * options.bonusSectionsPerAction / 60) * 60_000;
  return {
    usedMs,
    limitMs,
    share: limitMs > 0 ? Math.min(1, usedMs / limitMs) : 1,
    over: usedMs > limitMs,
    penalty,
  };
}

// [h:]mm:ss
export function clockText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return (hours > 0 ? hours + ':' : '') + pad(minutes) + ':' + pad(seconds);
}
