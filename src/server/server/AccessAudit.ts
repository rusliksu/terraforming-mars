import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {ParticipantId} from '../../common/Types';
import {ClientIp} from './clientIp';

export type AccessAuditEvent =
  'game_home' |
  'player_view' |
  'player_view_denied' |
  'spectator_view' |
  'waiting_for_player' |
  'waiting_for_spectator' |
  'player_input_attempt' |
  'player_input_accepted' |
  'player_input_rejected' |
  'autopass';

export type ParticipantKind = 'game' | 'player' | 'spectator';

export type AccessAuditRecordInput = {
  event: AccessAuditEvent;
  method: string;
  path: string;
  gameId?: string;
  participantId?: ParticipantId | string;
  participantKind: ParticipantKind;
  clientIp: ClientIp;
  clientId?: string;
  userAgent?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type AccessAuditOptions = {
  enabled: boolean;
  includeRawIp?: boolean;
  viewThrottleMs?: number;
  salt: string;
  appendLine: (line: string) => void;
  now: () => Date;
};

export type AccessAudit = {
  record(input: AccessAuditRecordInput): void;
};

function hmac(value: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(value).digest('base64url');
}

function ipPrefix(value: string): string {
  if (value.includes(':')) {
    const parts = value.split(':');
    return parts.slice(0, 4).join(':');
  }
  const parts = value.split('.');
  return parts.length === 4 ? parts.slice(0, 3).join('.') : value;
}

function cleanMetadata(metadata: Record<string, string | number | boolean | null> | undefined) {
  if (metadata === undefined) {
    return undefined;
  }
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      output[key] = value;
    }
  }
  return output;
}

const THROTTLED_EVENTS = new Set<AccessAuditEvent>([
  'game_home',
  'player_view',
  'spectator_view',
  'waiting_for_player',
  'waiting_for_spectator',
]);

function throttleKey(
  input: AccessAuditRecordInput,
  ipHash: string,
  userAgentHash: string,
  clientIdHash: string | undefined,
): string {
  const clientKey = clientIdHash === undefined ? `ip:${ipHash}` : `client:${clientIdHash}`;
  return [
    input.event,
    input.gameId ?? '',
    input.participantId ?? '',
    clientKey,
    userAgentHash,
  ].join(':');
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function newAccessAudit(options: AccessAuditOptions): AccessAudit {
  const lastViewEventAt = new Map<string, number>();

  return {
    record(input: AccessAuditRecordInput): void {
      if (!options.enabled) {
        return;
      }

      const now = options.now();
      const ipHash = hmac(input.clientIp.address, options.salt);
      const userAgentHash = hmac(input.userAgent ?? '', options.salt);
      const clientIdHash = input.clientId === undefined ? undefined : hmac(input.clientId, options.salt);
      const viewThrottleMs = options.viewThrottleMs ?? 0;
      if (viewThrottleMs > 0 && THROTTLED_EVENTS.has(input.event)) {
        const key = throttleKey(input, ipHash, userAgentHash, clientIdHash);
        const nowMs = now.getTime();
        const previousMs = lastViewEventAt.get(key);
        if (previousMs !== undefined && nowMs - previousMs < viewThrottleMs) {
          return;
        }
        lastViewEventAt.set(key, nowMs);
      }

      const record: Record<string, unknown> = {
        ts: now.toISOString(),
        event: input.event,
        method: input.method,
        path: input.path,
        gameId: input.gameId,
        participantId: input.participantId,
        participantKind: input.participantKind,
        ipSource: input.clientIp.source,
        ipHash,
        ipPrefixHash: hmac(ipPrefix(input.clientIp.address), options.salt),
        clientIdHash,
        userAgentHash,
        metadata: cleanMetadata(input.metadata),
      };

      if (options.includeRawIp === true) {
        record.rawIp = input.clientIp.address;
      }

      options.appendLine(JSON.stringify(record));
    },
  };
}

export function accessAuditWithClientId(accessAudit: AccessAudit, clientId: string | undefined): AccessAudit {
  if (clientId === undefined) {
    return accessAudit;
  }
  return {
    record(input: AccessAuditRecordInput): void {
      accessAudit.record({...input, clientId});
    },
  };
}

function dailyAuditFile(dir: string, now: Date): string {
  const day = now.toISOString().slice(0, 10);
  return path.join(dir, `access-audit-${day}.jsonl`);
}

export function accessAuditFromEnv(env: Record<string, string | undefined>): AccessAudit {
  const enabled = env.TM_ACCESS_AUDIT === '1';
  const salt = env.TM_ACCESS_AUDIT_SALT ?? 'development-access-audit-salt';
  const dir = env.TM_ACCESS_AUDIT_DIR ?? path.resolve(process.cwd(), 'access-audit-logs');
  const includeRawIp = env.TM_ACCESS_AUDIT_RAW_IP === '1';
  const viewThrottleMs = positiveInteger(env.TM_ACCESS_AUDIT_VIEW_THROTTLE_MS, 300000);

  return newAccessAudit({
    enabled,
    includeRawIp,
    viewThrottleMs,
    salt,
    now: () => new Date(),
    appendLine: (line: string) => {
      const now = new Date();
      fs.mkdirSync(dir, {recursive: true});
      fs.appendFileSync(dailyAuditFile(dir, now), line + '\n', {encoding: 'utf8'});
    },
  });
}
