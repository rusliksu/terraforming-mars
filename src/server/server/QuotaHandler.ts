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
  /** Most recent first, at most `limit` entries per ip. */
  private times = new Map<string, Array<number>>();

  private limit: number;
  private perMs: number;

  constructor(config: QuotaConfig) {
    this.limit = config.limit;
    this.perMs = config.perMs;
    console.log(`Initializing quota handler with {limit: ${this.limit}, perMs: ${this.perMs}}`);
  }

  /** Returns true when this request's ip has room for another request. Does not count against the quota. */
  isWithinQuota(ctx: Context): boolean {
    const times = this.times.get(ctx.ip) ?? [];
    if (times.length < this.limit) {
      return true;
    }
    const earliest = ctx.clock.now() - this.perMs;
    return times[this.limit - 1] <= earliest;
  }

  /** Counts this request against its ip's quota. */
  record(ctx: Context): void {
    const times = this.times.get(ctx.ip) ?? [];
    times.unshift(ctx.clock.now());
    times.length = Math.min(times.length, this.limit); // Trims the end, keeps the array the right size.
    this.times.set(ctx.ip, times);
  }
}
