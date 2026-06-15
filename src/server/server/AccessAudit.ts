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

export function newAccessAudit(options: AccessAuditOptions): AccessAudit {
  return {
    record(input: AccessAuditRecordInput): void {
      if (!options.enabled) {
        return;
      }

      const record: Record<string, unknown> = {
        ts: options.now().toISOString(),
        event: input.event,
        method: input.method,
        path: input.path,
        gameId: input.gameId,
        participantId: input.participantId,
        participantKind: input.participantKind,
        ipSource: input.clientIp.source,
        ipHash: hmac(input.clientIp.address, options.salt),
        ipPrefixHash: hmac(ipPrefix(input.clientIp.address), options.salt),
        clientIdHash: input.clientId === undefined ? undefined : hmac(input.clientId, options.salt),
        userAgentHash: hmac(input.userAgent ?? '', options.salt),
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

  return newAccessAudit({
    enabled,
    includeRawIp,
    salt,
    now: () => new Date(),
    appendLine: (line: string) => {
      const now = new Date();
      fs.mkdirSync(dir, {recursive: true});
      fs.appendFileSync(dailyAuditFile(dir, now), line + '\n', {encoding: 'utf8'});
    },
  });
}
