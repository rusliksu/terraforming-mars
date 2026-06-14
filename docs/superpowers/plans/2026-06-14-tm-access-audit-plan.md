# TM Access Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a privacy-conscious access audit trail and report tool that can identify likely cross-player hand-viewing on `tm.knightbyte.win` without dumping raw IP addresses into normal reports.

**Architecture:** Add a small server-side audit layer under `src/server/server/` that derives a trusted client identity, writes append-only JSONL events for game/player/spectator access, and keeps raw request bodies/cards/cookies out of logs. Add a CLI report under `src/server/tools/` that groups events by `gameId` and hashed client cluster, then classifies likely suspicious access patterns.

**Tech Stack:** Node.js 22, TypeScript, built-in `crypto`, built-in `fs`, existing Mocha/Chai test stack, existing custom HTTP route framework.

---

## Route

- Workstream: custom TM game server.
- Repo: `C:\Users\Ruslan\tm\terraforming-mars`.
- Current branch state observed before this plan: `work/custom-server-main-20260512...origin/work/custom-server-main-20260512 [ahead 2]` with unrelated modified `assets/elo/data.json` and `assets/elo/elo-data.json`. Do not touch those files.
- Staging target for any future deployment: `staging.tm.knightbyte.win`.
- Live/prod target: `tm.knightbyte.win`, only after explicit approval.

## Sources Used

- OWASP Logging Cheat Sheet: log protection, masking/hashing, retention, and access controls.
  https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP Top 10 A09 Security Logging and Monitoring Failures: log access-control-relevant events with enough context, structured logs, integrity controls.
  https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/
- Cloudflare HTTP headers: prefer `CF-Connecting-IP` or `True-Client-IP` over `X-Forwarded-For` for original visitor IP behind Cloudflare.
  https://developers.cloudflare.com/fundamentals/reference/http-headers/
- NGINX `ngx_http_realip_module`: configure trusted proxy addresses before accepting replacement client IP headers.
  https://nginx.org/en/docs/http/ngx_http_realip_module.html
- NIST SP 800-92 / SP 800-92r1 draft: log management covers generation, transmission, storage, access, disposal, and incident analysis.
  https://csrc.nist.gov/pubs/sp/800/92/final
  https://csrc.nist.gov/pubs/sp/800/92/r1/ipd

## Best-Practice Decisions

1. Do not publish raw IPs in reports. Store `ipHash`, `ipPrefixHash`, `userAgentHash`, and `ipSource`. Raw IP storage stays disabled by default.
2. Do not log cookies, Discord session IDs, player cards, request bodies, or full URLs with arbitrary query strings.
3. Treat IP as evidence, not proof. High-confidence signals require the same hashed IP plus same hashed user-agent touching multiple player IDs and submitting actions for one player.
4. Trust proxy headers only in this order: `CF-Connecting-IP`, `True-Client-IP`, first value of `X-Forwarded-For`, then `req.socket.remoteAddress`. Record the source for diagnostics.
5. Keep the initial feature server-only and report-only. No public UI. No admin browser page that leaks audit data.
6. Use opt-in environment variables. A normal local/dev server should not write audit files unless enabled.

## File Structure

- Create: `src/server/server/clientIp.ts`
  - Responsibility: extract and normalize client IP and source from trusted request headers/socket.
- Create: `tests/server/clientIp.spec.ts`
  - Responsibility: unit coverage for Cloudflare, XFF, socket fallback, IPv4-mapped IPv6, invalid headers.
- Create: `src/server/server/AccessAudit.ts`
  - Responsibility: hash client identity, build safe audit events, append JSONL when enabled.
- Create: `tests/server/AccessAudit.spec.ts`
  - Responsibility: verify disabled mode, safe hashing, JSONL shape, no raw IP by default.
- Modify: `src/server/Request.ts`
  - Responsibility: expose `socket.remoteAddress` in the local request type.
- Modify: `tests/routes/HttpMocks.ts`
  - Responsibility: add `remoteAddress` to mock socket.
- Modify: `src/server/routes/IHandler.ts`
  - Responsibility: add `clientIp` and `accessAudit` to route context.
- Modify: `src/server/server/requestProcessor.ts`
  - Responsibility: create one `ClientIp` per request, pass it through context, keep existing `ipTracker` compatible.
- Modify: `src/server/routes/ApiGame.ts`
  - Responsibility: log game lobby/home access.
- Modify: `src/server/routes/ApiPlayer.ts`
  - Responsibility: log successful player model access and denied attempts without exposing hidden data.
- Modify: `src/server/routes/ApiSpectator.ts`
  - Responsibility: log spectator model access, including whether private cards can be visible.
- Modify: `src/server/routes/ApiWaitingFor.ts`
  - Responsibility: log player/spectator polling lightly enough to avoid massive noise.
- Modify: `src/server/routes/PlayerInput.ts`
  - Responsibility: log action submissions as accepted/rejected without request body.
- Modify: `src/server/routes/Autopass.ts`
  - Responsibility: log autopass toggles.
- Create: `src/server/tools/access_audit_report.ts`
  - Responsibility: read audit JSONL and output redacted suspicious access report.
- Create: `tests/server/tools/access_audit_report.spec.ts`
  - Responsibility: verify grouping and severity classification.
- Optional later, not in first implementation: `api/security-audit` route. Avoid until CLI proves useful.

---

### Task 1: Add Trusted Client IP Extraction

**Files:**
- Create: `src/server/server/clientIp.ts`
- Create: `tests/server/clientIp.spec.ts`
- Modify: `src/server/Request.ts`
- Modify: `tests/routes/HttpMocks.ts`

- [x] **Step 1: Write failing tests for client IP extraction**

Create `tests/server/clientIp.spec.ts`:

```ts
import {expect} from 'chai';
import {getClientIp} from '../../src/server/server/clientIp';
import {MockRequest} from '../routes/HttpMocks';

describe('clientIp', () => {
  it('prefers CF-Connecting-IP', () => {
    const req = new MockRequest();
    req.headers['cf-connecting-ip'] = '203.0.113.10';
    req.headers['x-forwarded-for'] = '198.51.100.2, 198.51.100.3';
    req.socket.remoteAddress = '127.0.0.1';

    expect(getClientIp(req)).deep.eq({
      address: '203.0.113.10',
      source: 'cf-connecting-ip',
    });
  });

  it('uses True-Client-IP when Cloudflare connecting header is absent', () => {
    const req = new MockRequest();
    req.headers['true-client-ip'] = '203.0.113.11';
    req.headers['x-forwarded-for'] = '198.51.100.2';
    req.socket.remoteAddress = '127.0.0.1';

    expect(getClientIp(req)).deep.eq({
      address: '203.0.113.11',
      source: 'true-client-ip',
    });
  });

  it('uses first X-Forwarded-For entry when Cloudflare headers are absent', () => {
    const req = new MockRequest();
    req.headers['x-forwarded-for'] = '198.51.100.2, 198.51.100.3';
    req.socket.remoteAddress = '127.0.0.1';

    expect(getClientIp(req)).deep.eq({
      address: '198.51.100.2',
      source: 'x-forwarded-for',
    });
  });

  it('falls back to socket.remoteAddress', () => {
    const req = new MockRequest();
    req.socket.remoteAddress = '192.0.2.55';

    expect(getClientIp(req)).deep.eq({
      address: '192.0.2.55',
      source: 'socket.remoteAddress',
    });
  });

  it('normalizes IPv4-mapped IPv6 addresses', () => {
    const req = new MockRequest();
    req.socket.remoteAddress = '::ffff:192.0.2.44';

    expect(getClientIp(req)).deep.eq({
      address: '192.0.2.44',
      source: 'socket.remoteAddress',
    });
  });

  it('ignores invalid header values and falls back', () => {
    const req = new MockRequest();
    req.headers['cf-connecting-ip'] = 'not an ip';
    req.headers['x-forwarded-for'] = 'also not an ip';
    req.socket.remoteAddress = '192.0.2.56';

    expect(getClientIp(req)).deep.eq({
      address: '192.0.2.56',
      source: 'socket.remoteAddress',
    });
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test:server -- tests/server/clientIp.spec.ts
```

Expected: FAIL because `src/server/server/clientIp.ts` does not exist.

- [x] **Step 3: Extend request typing and mocks**

Modify `src/server/Request.ts` socket type to include `remoteAddress`:

```ts
socket: {
  address(): string | {} | net.AddressInfo;
  remoteAddress?: string;
}
```

Modify `tests/routes/HttpMocks.ts` mock socket:

```ts
public socket = {
  address: () => '127.0.0.1',
  remoteAddress: '127.0.0.1',
};
```

- [x] **Step 4: Implement `clientIp.ts`**

Create `src/server/server/clientIp.ts`:

```ts
import {isIP} from 'net';
import {Request} from '../Request';

export type ClientIpSource =
  'cf-connecting-ip' |
  'true-client-ip' |
  'x-forwarded-for' |
  'socket.remoteAddress' |
  'unknown';

export type ClientIp = {
  address: string;
  source: ClientIpSource;
};

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function normalizeIp(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.startsWith('::ffff:')) {
    const mapped = trimmed.slice('::ffff:'.length);
    return isIP(mapped) === 4 ? mapped : undefined;
  }
  return isIP(trimmed) === 0 ? undefined : trimmed;
}

function firstForwardedFor(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.split(',')[0]?.trim();
}

export function getClientIp(req: Request): ClientIp {
  const cfConnectingIp = normalizeIp(headerValue(req, 'cf-connecting-ip'));
  if (cfConnectingIp !== undefined) {
    return {address: cfConnectingIp, source: 'cf-connecting-ip'};
  }

  const trueClientIp = normalizeIp(headerValue(req, 'true-client-ip'));
  if (trueClientIp !== undefined) {
    return {address: trueClientIp, source: 'true-client-ip'};
  }

  const forwardedFor = normalizeIp(firstForwardedFor(headerValue(req, 'x-forwarded-for')));
  if (forwardedFor !== undefined) {
    return {address: forwardedFor, source: 'x-forwarded-for'};
  }

  const remoteAddress = normalizeIp(req.socket.remoteAddress);
  if (remoteAddress !== undefined) {
    return {address: remoteAddress, source: 'socket.remoteAddress'};
  }

  return {address: '', source: 'unknown'};
}
```

- [x] **Step 5: Run the client IP test**

Run:

```powershell
npm run test:server -- tests/server/clientIp.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/server/Request.ts tests/routes/HttpMocks.ts src/server/server/clientIp.ts tests/server/clientIp.spec.ts
git commit -m "Add trusted client IP extraction"
```

---

### Task 2: Add Safe Access Audit Logger

**Files:**
- Create: `src/server/server/AccessAudit.ts`
- Create: `tests/server/AccessAudit.spec.ts`

- [ ] **Step 1: Write failing tests for audit logger**

Create `tests/server/AccessAudit.spec.ts`:

```ts
import {expect} from 'chai';
import {newAccessAudit} from '../../src/server/server/AccessAudit';

describe('AccessAudit', () => {
  it('does nothing when disabled', () => {
    const lines: Array<string> = [];
    const audit = newAccessAudit({
      enabled: false,
      salt: 'test-salt',
      appendLine: (line) => lines.push(line),
      now: () => new Date('2026-06-14T10:00:00.000Z'),
    });

    audit.record({
      event: 'player_view',
      method: 'GET',
      path: 'api/player',
      gameId: 'g123',
      participantId: 'p123',
      participantKind: 'player',
      clientIp: {address: '203.0.113.10', source: 'cf-connecting-ip'},
      userAgent: 'Browser A',
    });

    expect(lines).deep.eq([]);
  });

  it('writes hashed JSONL without raw IP by default', () => {
    const lines: Array<string> = [];
    const audit = newAccessAudit({
      enabled: true,
      salt: 'test-salt',
      appendLine: (line) => lines.push(line),
      now: () => new Date('2026-06-14T10:00:00.000Z'),
    });

    audit.record({
      event: 'player_view',
      method: 'GET',
      path: 'api/player',
      gameId: 'g123',
      participantId: 'p123',
      participantKind: 'player',
      clientIp: {address: '203.0.113.10', source: 'cf-connecting-ip'},
      userAgent: 'Browser A',
    });

    expect(lines.length).eq(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.ts).eq('2026-06-14T10:00:00.000Z');
    expect(entry.event).eq('player_view');
    expect(entry.gameId).eq('g123');
    expect(entry.participantId).eq('p123');
    expect(entry.participantKind).eq('player');
    expect(entry.ipSource).eq('cf-connecting-ip');
    expect(entry.ipHash).to.be.a('string').and.to.have.length.greaterThan(20);
    expect(entry.ipPrefixHash).to.be.a('string').and.to.have.length.greaterThan(20);
    expect(entry.userAgentHash).to.be.a('string').and.to.have.length.greaterThan(20);
    expect(JSON.stringify(entry)).not.contains('203.0.113.10');
    expect(JSON.stringify(entry)).not.contains('Browser A');
  });

  it('stores raw IP only when explicitly enabled', () => {
    const lines: Array<string> = [];
    const audit = newAccessAudit({
      enabled: true,
      includeRawIp: true,
      salt: 'test-salt',
      appendLine: (line) => lines.push(line),
      now: () => new Date('2026-06-14T10:00:00.000Z'),
    });

    audit.record({
      event: 'spectator_view',
      method: 'GET',
      path: 'api/spectator',
      gameId: 'g123',
      participantId: 's123',
      participantKind: 'spectator',
      clientIp: {address: '2001:db8:abcd:0012:0000:0000:0000:0001', source: 'cf-connecting-ip'},
      userAgent: 'Browser B',
      metadata: {privateHandsVisible: false},
    });

    const entry = JSON.parse(lines[0]);
    expect(entry.rawIp).eq('2001:db8:abcd:0012:0000:0000:0000:0001');
    expect(entry.metadata.privateHandsVisible).eq(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test:server -- tests/server/AccessAudit.spec.ts
```

Expected: FAIL because `AccessAudit.ts` does not exist.

- [ ] **Step 3: Implement `AccessAudit.ts`**

Create `src/server/server/AccessAudit.ts`:

```ts
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {ClientIp} from './clientIp';
import {ParticipantId} from '../../common/Types';

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

function dailyAuditFile(dir: string, now: Date): string {
  const day = now.toISOString().slice(0, 10);
  return path.join(dir, `access-audit-${day}.jsonl`);
}

export function accessAuditFromEnv(env: NodeJS.ProcessEnv): AccessAudit {
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
      fs.mkdirSync(dir, {recursive: true});
      fs.appendFileSync(dailyAuditFile(dir, new Date()), line + '\n', {encoding: 'utf8'});
    },
  });
}
```

- [ ] **Step 4: Run the audit logger test**

Run:

```powershell
npm run test:server -- tests/server/AccessAudit.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/server/server/AccessAudit.ts tests/server/AccessAudit.spec.ts
git commit -m "Add safe access audit logger"
```

---

### Task 3: Wire Audit Context and Existing IP Tracker

**Files:**
- Modify: `src/server/routes/IHandler.ts`
- Modify: `src/server/server/requestProcessor.ts`

- [ ] **Step 1: Write failing request processor test**

Modify `tests/server/requestProcessor.spec.ts` and add this test:

```ts
it('uses CF-Connecting-IP for the request context IP tracker', async () => {
  const originalGetInstance = GameLoader.getInstance;
  const req = new MockRequest();
  const res = new MockResponse();
  req.headers.host = 'tm.knightbyte.win';
  req.headers['cf-connecting-ip'] = '203.0.113.10';
  req.url = '/missing';

  (GameLoader as typeof GameLoader & {getInstance: typeof GameLoader.getInstance}).getInstance = (() => {
    return {} as ReturnType<typeof GameLoader.getInstance>;
  }) as typeof GameLoader.getInstance;

  try {
    processRequest(req, res);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(res.statusCode).eq(statusCode.notFound);
  } finally {
    (GameLoader as typeof GameLoader & {getInstance: typeof GameLoader.getInstance}).getInstance = originalGetInstance;
  }
});
```

This test only checks routing still works. Context-level audit will be covered in route tests in later tasks.

- [ ] **Step 2: Run targeted request processor tests**

Run:

```powershell
npm run test:server -- tests/server/requestProcessor.spec.ts
```

Expected: PASS before code changes or FAIL only if the current processor has hidden assumptions. Continue with the wiring either way.

- [ ] **Step 3: Modify `IHandler.ts` context**

Add imports:

```ts
import {AccessAudit} from '../server/AccessAudit';
import {ClientIp} from '../server/clientIp';
```

Add fields to `Context`:

```ts
clientIp: ClientIp,
accessAudit: AccessAudit,
```

- [ ] **Step 4: Modify `requestProcessor.ts`**

Add imports:

```ts
import {accessAuditFromEnv} from './AccessAudit';
import {getClientIp} from './clientIp';
```

Create module-level audit:

```ts
const accessAudit = accessAuditFromEnv(process.env);
```

Replace both calls to `getIPAddress(req)` with one `getClientIp(req)` result. The relevant section should become:

```ts
const clientIp = getClientIp(req);
ipTracker.add(clientIp.address);
if (ipBlocklist.isBlocked(clientIp.address)) {
  responses.notFound(req, res);
}
```

And context construction should include:

```ts
ip: clientIp.address,
clientIp,
ipTracker: ipTracker,
accessAudit,
```

Leave the old `getHerokuIpAddress` helper unused only if no import remains. Remove `getIPAddress` if it is no longer referenced.

- [ ] **Step 5: Update `RouteTestScaffolding.ts`**

Add imports:

```ts
import {newAccessAudit} from '../../src/server/server/AccessAudit';
```

Add to the fake context:

```ts
clientIp: {address: '123.45.678.90', source: 'unknown'},
accessAudit: newAccessAudit({
  enabled: false,
  salt: 'test-salt',
  now: () => new Date('2026-06-14T10:00:00.000Z'),
  appendLine: () => {},
}),
```

- [ ] **Step 6: Run route and server tests**

Run:

```powershell
npm run test:server -- tests/server/requestProcessor.spec.ts tests/routes/ApiIPs.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/server/routes/IHandler.ts src/server/server/requestProcessor.ts tests/routes/RouteTestScaffolding.ts tests/server/requestProcessor.spec.ts
git commit -m "Wire access audit context"
```

---

### Task 4: Instrument Game, Player, Spectator, Waiting, and Input Routes

**Files:**
- Modify: `src/server/routes/ApiGame.ts`
- Modify: `src/server/routes/ApiPlayer.ts`
- Modify: `src/server/routes/ApiSpectator.ts`
- Modify: `src/server/routes/ApiWaitingFor.ts`
- Modify: `src/server/routes/PlayerInput.ts`
- Modify: `src/server/routes/Autopass.ts`
- Modify tests in `tests/routes/*.spec.ts`

- [ ] **Step 1: Add audit capture helper to route tests**

In each touched route test, override `scaffolding.ctx.accessAudit`:

```ts
const auditEvents: Array<any> = [];
scaffolding.ctx.accessAudit = {
  record: (event) => auditEvents.push(event),
};
scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
```

- [ ] **Step 2: Add ApiPlayer audit test**

Modify `tests/routes/ApiPlayer.spec.ts` with a test equivalent to:

```ts
it('audits successful player view', async () => {
  const auditEvents: Array<any> = [];
  scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
  scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
  const player = TestPlayer.BLACK.newPlayer();
  const game = Game.newInstance('game-id', [player], player, 'spectator-id', undefined, undefined);
  scaffolding.ctx.gameLoader.add(game);
  scaffolding.url = '/api/player?id=' + player.id;

  await scaffolding.get(ApiPlayer.INSTANCE, res);

  expect(auditEvents).deep.include({
    event: 'player_view',
    method: 'GET',
    path: 'api/player',
    gameId: game.id,
    participantId: player.id,
    participantKind: 'player',
    clientIp: scaffolding.ctx.clientIp,
    userAgent: undefined,
  });
});
```

- [ ] **Step 3: Implement ApiPlayer audit**

In `src/server/routes/ApiPlayer.ts`, after authorization succeeds and before `responses.writeJson`:

```ts
ctx.accessAudit.record({
  event: 'player_view',
  method: req.method,
  path: 'api/player',
  gameId: game.id,
  participantId: playerId,
  participantKind: 'player',
  clientIp: ctx.clientIp,
  userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
});
```

Before returning `notAuthorized`, add:

```ts
ctx.accessAudit.record({
  event: 'player_view_denied',
  method: req.method,
  path: 'api/player',
  gameId: game.id,
  participantId: playerId,
  participantKind: 'player',
  clientIp: ctx.clientIp,
  userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
});
```

- [ ] **Step 4: Add ApiSpectator audit test and implementation**

Add to `tests/routes/ApiSpectator.spec.ts`:

```ts
it('audits spectator view', async () => {
  const auditEvents: Array<any> = [];
  scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
  scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
  const player = TestPlayer.BLACK.newPlayer();
  const game = Game.newInstance('game-id', [player], player, 'spectator-id', undefined, undefined);
  scaffolding.url = '/api/spectator?id=' + game.spectatorId;
  scaffolding.ctx.gameLoader.add(game);

  await scaffolding.get(ApiSpectator.INSTANCE, res);

  expect(auditEvents[0]).deep.include({
    event: 'spectator_view',
    method: 'GET',
    path: 'api/spectator',
    gameId: game.id,
    participantId: game.spectatorId,
    participantKind: 'spectator',
    clientIp: scaffolding.ctx.clientIp,
  });
  expect(auditEvents[0].metadata.privateHandsVisible).eq(false);
});
```

In `src/server/routes/ApiSpectator.ts`, before `responses.writeJson`:

```ts
ctx.accessAudit.record({
  event: 'spectator_view',
  method: req.method,
  path: 'api/spectator',
  gameId: game.id,
  participantId: game.spectatorId,
  participantKind: 'spectator',
  clientIp: ctx.clientIp,
  userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
  metadata: {
    privateHandsVisible: game.phase === Phase.END || game.gameOptions.privateHands === false,
  },
});
```

Add `Phase` import:

```ts
import {Phase} from '../../common/Phase';
```

- [ ] **Step 5: Add ApiGame audit**

In `src/server/routes/ApiGame.ts`, before `responses.writeJson`:

```ts
ctx.accessAudit.record({
  event: 'game_home',
  method: req.method,
  path: 'api/game',
  gameId: game.id,
  participantId: game.id,
  participantKind: 'game',
  clientIp: ctx.clientIp,
  userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
});
```

Add a matching test in `tests/routes/ApiGame.spec.ts`.

- [ ] **Step 6: Add ApiWaitingFor audit with low-noise behavior**

Only log `waiting_for_player` when `id` is a player and authorization succeeds. Only log `waiting_for_spectator` if `TM_ACCESS_AUDIT_WAITING_FOR=1`; otherwise skip spectator poll logs to reduce noise.

Implementation shape:

```ts
if (isPlayerId(id)) {
  ctx.accessAudit.record({
    event: 'waiting_for_player',
    method: req.method,
    path: 'api/waitingfor',
    gameId: game.id,
    participantId: id,
    participantKind: 'player',
    clientIp: ctx.clientIp,
    userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
  });
}
```

For spectator:

```ts
if (isSpectatorId(id) && process.env.TM_ACCESS_AUDIT_WAITING_FOR === '1') {
  ctx.accessAudit.record({
    event: 'waiting_for_spectator',
    method: req.method,
    path: 'api/waitingfor',
    gameId: game.id,
    participantId: id,
    participantKind: 'spectator',
    clientIp: ctx.clientIp,
    userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
  });
}
```

Add tests in `tests/routes/ApiWaitingFor.spec.ts` for player polling. Do not add env-dependent spectator test unless the test resets `process.env.TM_ACCESS_AUDIT_WAITING_FOR` in `finally`.

- [ ] **Step 7: Add PlayerInput audit**

At start of `PlayerInput.post`, after `playerId` validation:

```ts
ctx.accessAudit.record({
  event: 'player_input_attempt',
  method: req.method,
  path: 'player/input',
  participantId: playerId,
  participantKind: 'player',
  clientIp: ctx.clientIp,
  userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
});
```

Inside the successful branch after `responses.writeJson`, record accepted with game id:

```ts
ctx.accessAudit.record({
  event: 'player_input_accepted',
  method: req.method,
  path: 'player/input',
  gameId: player.game.id,
  participantId: player.id,
  participantKind: 'player',
  clientIp: ctx.clientIp,
  userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
  metadata: {
    inputType: typeof entityForLog?.type === 'string' ? entityForLog.type : null,
    isUndo,
  },
});
```

Inside `catch`, before writing the bad request response, record rejected:

```ts
ctx.accessAudit.record({
  event: 'player_input_rejected',
  method: req.method,
  path: 'player/input',
  gameId: player.game.id,
  participantId: player.id,
  participantKind: 'player',
  clientIp: ctx.clientIp,
  userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
  metadata: {
    isUndo,
    errorId: e instanceof AppError ? e.id : null,
  },
});
```

Add focused tests in `tests/routes/PlayerInput.spec.ts` only if existing scaffolding can submit a minimal input. If it is too brittle, cover accepted action classification through analyzer tests and add a route test only for `player_input_attempt`.

- [ ] **Step 8: Add Autopass audit**

In `src/server/routes/Autopass.ts`, after player lookup succeeds:

```ts
ctx.accessAudit.record({
  event: 'autopass',
  method: req.method,
  path: 'autopass',
  gameId: game.id,
  participantId: player.id,
  participantKind: 'player',
  clientIp: ctx.clientIp,
  userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
  metadata: {autopass},
});
```

Add matching test in `tests/routes/Autopass.spec.ts`.

- [ ] **Step 9: Run route tests**

Run:

```powershell
npm run test:server -- tests/routes/ApiGame.spec.ts tests/routes/ApiPlayer.spec.ts tests/routes/ApiSpectator.spec.ts tests/routes/ApiWaitingFor.spec.ts tests/routes/Autopass.spec.ts tests/routes/PlayerInput.spec.ts
```

Expected: PASS.

- [ ] **Step 10: Commit**

```powershell
git add src/server/routes/ApiGame.ts src/server/routes/ApiPlayer.ts src/server/routes/ApiSpectator.ts src/server/routes/ApiWaitingFor.ts src/server/routes/PlayerInput.ts src/server/routes/Autopass.ts tests/routes/ApiGame.spec.ts tests/routes/ApiPlayer.spec.ts tests/routes/ApiSpectator.spec.ts tests/routes/ApiWaitingFor.spec.ts tests/routes/Autopass.spec.ts tests/routes/PlayerInput.spec.ts
git commit -m "Audit game access routes"
```

---

### Task 5: Add Redacted Audit Report CLI

**Files:**
- Create: `src/server/tools/access_audit_report.ts`
- Create: `tests/server/tools/access_audit_report.spec.ts`

- [ ] **Step 1: Write failing analyzer tests**

Create `tests/server/tools/access_audit_report.spec.ts`:

```ts
import {expect} from 'chai';
import {analyzeAccessAudit} from '../../../src/server/tools/access_audit_report';

describe('access_audit_report', () => {
  it('flags a client cluster that acts as one player after viewing another player', () => {
    const report = analyzeAccessAudit([
      {
        ts: '2026-06-14T10:00:00.000Z',
        event: 'player_view',
        gameId: 'g1',
        participantId: 'p-red',
        participantKind: 'player',
        ipHash: 'ip-a',
        ipPrefixHash: 'prefix-a',
        userAgentHash: 'ua-a',
      },
      {
        ts: '2026-06-14T10:01:00.000Z',
        event: 'player_view',
        gameId: 'g1',
        participantId: 'p-blue',
        participantKind: 'player',
        ipHash: 'ip-a',
        ipPrefixHash: 'prefix-a',
        userAgentHash: 'ua-a',
      },
      {
        ts: '2026-06-14T10:02:00.000Z',
        event: 'player_input_accepted',
        gameId: 'g1',
        participantId: 'p-red',
        participantKind: 'player',
        ipHash: 'ip-a',
        ipPrefixHash: 'prefix-a',
        userAgentHash: 'ua-a',
      },
    ]);

    expect(report.findings).deep.eq([
      {
        severity: 'high',
        gameId: 'g1',
        cluster: 'ip-a:ua-a',
        actedAs: ['p-red'],
        viewedPlayers: ['p-blue', 'p-red'],
        spectatorViews: [],
        reason: 'same IP and user-agent submitted input for one player after viewing another player in the same game',
        firstSeen: '2026-06-14T10:00:00.000Z',
        lastSeen: '2026-06-14T10:02:00.000Z',
      },
    ]);
  });

  it('reports external viewers separately from likely player cheating', () => {
    const report = analyzeAccessAudit([
      {
        ts: '2026-06-14T10:00:00.000Z',
        event: 'player_view',
        gameId: 'g1',
        participantId: 'p-red',
        participantKind: 'player',
        ipHash: 'ip-b',
        ipPrefixHash: 'prefix-b',
        userAgentHash: 'ua-b',
      },
    ]);

    expect(report.findings).deep.eq([
      {
        severity: 'info',
        gameId: 'g1',
        cluster: 'ip-b:ua-b',
        actedAs: [],
        viewedPlayers: ['p-red'],
        spectatorViews: [],
        reason: 'client viewed player data but did not submit actions in this audit window',
        firstSeen: '2026-06-14T10:00:00.000Z',
        lastSeen: '2026-06-14T10:00:00.000Z',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run analyzer test to verify failure**

Run:

```powershell
npm run test:server -- tests/server/tools/access_audit_report.spec.ts
```

Expected: FAIL because `access_audit_report.ts` does not exist.

- [ ] **Step 3: Implement analyzer**

Create `src/server/tools/access_audit_report.ts`:

```ts
import * as fs from 'fs';

export type AuditLogEntry = {
  ts: string;
  event: string;
  gameId?: string;
  participantId?: string;
  participantKind?: string;
  ipHash?: string;
  ipPrefixHash?: string;
  userAgentHash?: string;
  metadata?: Record<string, unknown>;
};

export type AuditFinding = {
  severity: 'high' | 'medium' | 'info';
  gameId: string;
  cluster: string;
  actedAs: Array<string>;
  viewedPlayers: Array<string>;
  spectatorViews: Array<string>;
  reason: string;
  firstSeen: string;
  lastSeen: string;
};

export type AuditReport = {
  findings: Array<AuditFinding>;
};

type Bucket = {
  gameId: string;
  cluster: string;
  firstSeen: string;
  lastSeen: string;
  actedAs: Set<string>;
  viewedPlayers: Set<string>;
  spectatorViews: Set<string>;
};

function sorted(values: Set<string>): Array<string> {
  return Array.from(values).sort();
}

function updateWindow(bucket: Bucket, ts: string) {
  if (ts < bucket.firstSeen) {
    bucket.firstSeen = ts;
  }
  if (ts > bucket.lastSeen) {
    bucket.lastSeen = ts;
  }
}

export function analyzeAccessAudit(entries: Array<AuditLogEntry>): AuditReport {
  const buckets = new Map<string, Bucket>();

  for (const entry of entries) {
    if (entry.gameId === undefined || entry.ipHash === undefined || entry.userAgentHash === undefined || entry.ts === undefined) {
      continue;
    }
    const cluster = `${entry.ipHash}:${entry.userAgentHash}`;
    const key = `${entry.gameId}:${cluster}`;
    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = {
        gameId: entry.gameId,
        cluster,
        firstSeen: entry.ts,
        lastSeen: entry.ts,
        actedAs: new Set(),
        viewedPlayers: new Set(),
        spectatorViews: new Set(),
      };
      buckets.set(key, bucket);
    }
    updateWindow(bucket, entry.ts);

    if ((entry.event === 'player_view' || entry.event === 'player_view_denied') && entry.participantId !== undefined) {
      bucket.viewedPlayers.add(entry.participantId);
    }
    if (entry.event === 'player_input_accepted' && entry.participantId !== undefined) {
      bucket.actedAs.add(entry.participantId);
    }
    if (entry.event === 'spectator_view' && entry.participantId !== undefined) {
      bucket.spectatorViews.add(entry.participantId);
    }
  }

  const findings: Array<AuditFinding> = [];

  for (const bucket of buckets.values()) {
    const actedAs = sorted(bucket.actedAs);
    const viewedPlayers = sorted(bucket.viewedPlayers);
    const spectatorViews = sorted(bucket.spectatorViews);
    const foreignViews = viewedPlayers.filter((id) => !bucket.actedAs.has(id));

    if (actedAs.length > 0 && foreignViews.length > 0) {
      findings.push({
        severity: 'high',
        gameId: bucket.gameId,
        cluster: bucket.cluster,
        actedAs,
        viewedPlayers,
        spectatorViews,
        reason: 'same IP and user-agent submitted input for one player after viewing another player in the same game',
        firstSeen: bucket.firstSeen,
        lastSeen: bucket.lastSeen,
      });
      continue;
    }

    if (actedAs.length > 0 && spectatorViews.length > 0) {
      findings.push({
        severity: 'medium',
        gameId: bucket.gameId,
        cluster: bucket.cluster,
        actedAs,
        viewedPlayers,
        spectatorViews,
        reason: 'same IP and user-agent submitted input and opened spectator view in the same game',
        firstSeen: bucket.firstSeen,
        lastSeen: bucket.lastSeen,
      });
      continue;
    }

    if (actedAs.length === 0 && viewedPlayers.length > 0) {
      findings.push({
        severity: 'info',
        gameId: bucket.gameId,
        cluster: bucket.cluster,
        actedAs,
        viewedPlayers,
        spectatorViews,
        reason: 'client viewed player data but did not submit actions in this audit window',
        firstSeen: bucket.firstSeen,
        lastSeen: bucket.lastSeen,
      });
    }
  }

  findings.sort((a, b) => {
    const rank = {high: 0, medium: 1, info: 2};
    return rank[a.severity] - rank[b.severity] || a.gameId.localeCompare(b.gameId) || a.firstSeen.localeCompare(b.firstSeen);
  });

  return {findings};
}

export function readJsonl(filename: string): Array<AuditLogEntry> {
  return fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as AuditLogEntry);
}

if (require.main === module) {
  const filename = process.argv[2];
  if (filename === undefined) {
    console.error('Usage: npx tsx src/server/tools/access_audit_report.ts <audit.jsonl>');
    process.exit(1);
  }
  const report = analyzeAccessAudit(readJsonl(filename));
  console.log(JSON.stringify(report, null, 2));
}
```

- [ ] **Step 4: Run analyzer tests**

Run:

```powershell
npm run test:server -- tests/server/tools/access_audit_report.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/server/tools/access_audit_report.ts tests/server/tools/access_audit_report.spec.ts
git commit -m "Add access audit report tool"
```

---

### Task 6: Full Local Validation

**Files:**
- No new files unless tests reveal a targeted fix.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
npm run test:server -- tests/server/clientIp.spec.ts tests/server/AccessAudit.spec.ts tests/server/tools/access_audit_report.spec.ts tests/server/requestProcessor.spec.ts tests/routes/ApiGame.spec.ts tests/routes/ApiPlayer.spec.ts tests/routes/ApiSpectator.spec.ts tests/routes/ApiWaitingFor.spec.ts tests/routes/Autopass.spec.ts tests/routes/PlayerInput.spec.ts tests/routes/ApiIPs.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run server lint**

Run:

```powershell
npm run lint:server
```

Expected: PASS.

- [ ] **Step 3: Run server build**

Run:

```powershell
npm run build:server
```

Expected: PASS.

- [ ] **Step 4: Run full server tests if targeted checks pass**

Run:

```powershell
npm run test:server
```

Expected: PASS.

- [ ] **Step 5: Commit validation-only fixes if needed**

If any validation fix was required:

```powershell
git add <changed-files>
git commit -m "Stabilize access audit checks"
```

If no validation fix was required, do not create an empty commit.

---

### Task 7: Staging Rollout Plan

**Files:**
- No local source files.
- VPS operations must use `C:\Users\Ruslan\gurra\scripts\codex-vps-run.ps1`.

- [ ] **Step 1: Confirm VPS wrapper status**

Run locally:

```powershell
C:\Users\Ruslan\gurra\scripts\codex-vps-run.ps1 -Status
```

Expected: read-only status succeeds. If it reports auth failure, ask Ruslan to run:

```powershell
C:\Users\Ruslan\gurra\scripts\codex-vps-run.ps1 -Login
```

- [ ] **Step 2: Prepare staging environment variables**

Use VPS Codex in read-only mode first to inspect how staging env is configured. Do not print secret values.

Target variables:

```text
TM_ACCESS_AUDIT=1
TM_ACCESS_AUDIT_DIR=/home/openclaw/tm-runtime/staging/shared/logs/access-audit
TM_ACCESS_AUDIT_SALT=<set on VPS, do not print>
TM_ACCESS_AUDIT_RAW_IP=0
TM_ACCESS_AUDIT_WAITING_FOR=0
```

- [ ] **Step 3: Deploy to staging only**

Follow existing staging deploy rules from `C:\Users\Ruslan\shared-memory\claude-code\terraforming-mars.md`. Do not deploy to prod.

- [ ] **Step 4: Smoke staging**

Open or curl staging:

```powershell
curl.exe -I https://staging.tm.knightbyte.win/
```

Expected: HTTP 200.

Create a tiny staging test game, open:

```text
https://staging.tm.knightbyte.win/game?id=<gameId>
https://staging.tm.knightbyte.win/player?id=<playerId>
https://staging.tm.knightbyte.win/spectator?id=<spectatorId>
```

Expected: JSONL file appears on VPS under the staging audit dir.

- [ ] **Step 5: Run report on staging audit file**

Delegate to VPS Codex:

```powershell
C:\Users\Ruslan\gurra\scripts\codex-vps-run.ps1 -Sandbox read-only "Run the TM access audit report on the latest staging access-audit JSONL. Return only redacted findings: gameId, cluster ids, actedAs, viewedPlayers, severity, reason. Do not print raw IPs or secrets."
```

Expected: report contains test events and no raw IPs.

---

### Task 8: Live Experiment Protocol

**Files:**
- No local source files.
- Requires explicit user approval before any live/prod deploy or service restart.

- [ ] **Step 1: Decide the experiment scope**

Recommended first scope:

```text
One planned live game.
Audit enabled for 24-48 hours.
Raw IP disabled.
Waiting-for spectator polling disabled.
Report redacted.
```

- [ ] **Step 2: Tell players the practical rule**

Message to players:

```text
For this game, use only your own player link. Do not open other player links. Spectator links are allowed only for non-players unless explicitly agreed.
```

Do not mention implementation details, hashes, or detection thresholds.

- [ ] **Step 3: Enable on live only after explicit approval**

Before live:

```powershell
C:\Users\Ruslan\gurra\scripts\codex-vps-run.ps1 -Status
```

Then follow prod deployment rules:
- snapshot `prod/current`, `staging/current`, release manifests, service timestamps;
- do not modify SQLite while active games use it;
- deploy only if Ruslan explicitly approves live/prod.

- [ ] **Step 4: Generate redacted report after the game**

Delegate:

```powershell
C:\Users\Ruslan\gurra\scripts\codex-vps-run.ps1 -Sandbox read-only "For game <gameId>, analyze live TM access-audit logs for the audit window. Return redacted findings only: severity, cluster, actedAs, viewedPlayers, spectatorViews, firstSeen, lastSeen, reason. Do not print raw IPs, headers, cookies, secrets, or full log lines."
```

Expected output examples:

```json
{
  "findings": [
    {
      "severity": "high",
      "gameId": "g...",
      "cluster": "hash:hash",
      "actedAs": ["p-red"],
      "viewedPlayers": ["p-red", "p-blue"],
      "spectatorViews": [],
      "firstSeen": "2026-06-14T18:01:00.000Z",
      "lastSeen": "2026-06-14T18:11:00.000Z",
      "reason": "same IP and user-agent submitted input for one player after viewing another player in the same game"
    }
  ]
}
```

- [ ] **Step 5: Interpret findings conservatively**

Use this classification:

```text
high: same ipHash + userAgentHash viewed other player id and submitted accepted input for a different player in same game.
medium: same ipHash + userAgentHash submitted input and opened spectator; relevant only if spectator private cards were visible.
info: client viewed player data but did not act as a player in the audit window.
not proof: same ipPrefixHash only, VPN/mobile ASN suspicion, shared Wi-Fi, spectator with privateHands true.
```

---

## Self-Review

- Spec coverage: The plan covers proxy IP correctness, privacy-safe logging, route instrumentation, redacted reporting, tests, staging rollout, and live experiment protocol.
- Placeholder scan: Clean; every task has concrete files, commands, and expected results.
- Type consistency: `ClientIp`, `AccessAudit`, `AccessAuditRecordInput`, and route `Context` names are consistent across tasks.
- Risk left open by design: The first implementation is not a legal/compliance system. It is an operational audit tool for Ruslan's server. Raw IPs stay out of default reports.
