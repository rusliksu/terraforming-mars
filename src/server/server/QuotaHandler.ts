import {Context} from '../routes/IHandler';
import {durationToMilliseconds} from '../utils/durations';

export type QuotaConfig = {
  limit: number;
  perMs: number;
}

function parseQuotaConfig(struct: any): QuotaConfig {
  let {limit} = struct;
  const {per} = struct;
  if (limit === undefined) {
    throw new Error('limit is absent');
  }
  limit = Number.parseInt(limit);
  if (isNaN(limit)) {
    throw new Error('limit is invalid');
  }
  if (per === undefined) {
    throw new Error('per is absent');
  }
  const perMs = durationToMilliseconds(per);
  if (isNaN(perMs)) {
    throw new Error('per is invalid');
  }
  return {limit, perMs};
}

// Reads a quota configuration from an environment variable. The value accepts either a single
// {limit, per} object, or a JSON array of them for multiple independent tiers (e.g. a burst
// limit and a daily limit) -- a request must satisfy every configured tier to succeed.
export function getQuotaConfigsFromEnv(envVarName: string, defaultConfig: QuotaConfig): Array<QuotaConfig> {
  const val = process.env[envVarName];
  if (val) {
    try {
      const parsed = JSON.parse(val);
      const structs = Array.isArray(parsed) ? parsed : [parsed];
      if (structs.length === 0) {
        throw new Error(`${envVarName} array is empty`);
      }
      return structs.map(parseQuotaConfig);
    } catch (e) {
      console.warn(`While initializing quota from ${envVarName}:`, (e instanceof Error ? e.message : e));
    }
  }
  return [defaultConfig];
}

export class QuotaHandler {
  private times = new Map<string, Array<number | undefined>>();

  private limit: number;
  private perMs: number;

  constructor(config: QuotaConfig) {
    this.limit = config.limit;
    this.perMs = config.perMs;
    console.log(`Initialzing quota handler with {limit: ${this.limit}, perMs: ${this.perMs}}`);
  }

  measure(ctx: Context): boolean {
    const ip = ctx.ip;
    const now = ctx.clock.now();

    const times = this.times.get(ip) || [];
    times.unshift(now);
    times.length = this.limit + 1; // Trims the end, keeps the array the right size. (There are more efficient ways to do this, especially in C.)
    this.times.set(ip, times);

    const earliest = now - this.perMs;
    const oldestInCache = times[times.length - 1];
    if (oldestInCache !== undefined && oldestInCache > earliest) {
      return false;
    }

    return true;
  }
}
