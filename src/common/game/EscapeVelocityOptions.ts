import * as constants from '../constants';
import {EscapeVelocityOptions} from './NewGameConfig';

type EscapeVelocityInput = Partial<Record<keyof EscapeVelocityOptions, unknown>> | null | undefined;

type NumberRule = {
  defaultValue: number;
  min: number;
  max: number;
};

const RULES: Record<keyof EscapeVelocityOptions, NumberRule> = {
  thresholdMinutes: {
    defaultValue: constants.DEFAULT_ESCAPE_VELOCITY_THRESHOLD,
    min: 0,
    max: 180,
  },
  bonusSectionsPerAction: {
    defaultValue: constants.DEFAULT_ESCAPE_VELOCITY_BONUS_SECONDS,
    min: 1,
    max: 10,
  },
  penaltyPeriodMinutes: {
    defaultValue: constants.DEFAULT_ESCAPE_VELOCITY_PERIOD,
    min: 1,
    max: 10,
  },
  penaltyVPPerPeriod: {
    defaultValue: constants.DEFAULT_ESCAPE_VELOCITY_PENALTY,
    min: 1,
    max: 10,
  },
};

function parseNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
}

function isValidNumber(value: unknown, rule: NumberRule): boolean {
  const parsed = parseNumber(value);
  return parsed !== undefined && parsed >= rule.min && parsed <= rule.max;
}

function normalizeNumber(value: unknown, rule: NumberRule): number {
  const parsed = parseNumber(value);
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < rule.min || parsed > rule.max) {
    return rule.defaultValue;
  }
  return parsed;
}

export function normalizeEscapeVelocityOptions(options: EscapeVelocityInput): EscapeVelocityOptions | undefined {
  if (options === undefined || options === null) {
    return undefined;
  }
  return {
    thresholdMinutes: normalizeNumber(options.thresholdMinutes, RULES.thresholdMinutes),
    bonusSectionsPerAction: normalizeNumber(options.bonusSectionsPerAction, RULES.bonusSectionsPerAction),
    penaltyPeriodMinutes: normalizeNumber(options.penaltyPeriodMinutes, RULES.penaltyPeriodMinutes),
    penaltyVPPerPeriod: normalizeNumber(options.penaltyVPPerPeriod, RULES.penaltyVPPerPeriod),
  };
}

export function hasMalformedEscapeVelocityOptions(options: EscapeVelocityInput): boolean {
  if (options === undefined || options === null) {
    return false;
  }
  return !isValidNumber(options.thresholdMinutes, RULES.thresholdMinutes) ||
    !isValidNumber(options.bonusSectionsPerAction, RULES.bonusSectionsPerAction) ||
    !isValidNumber(options.penaltyPeriodMinutes, RULES.penaltyPeriodMinutes) ||
    !isValidNumber(options.penaltyVPPerPeriod, RULES.penaltyVPPerPeriod);
}
