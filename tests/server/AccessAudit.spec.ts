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

  it('hashes audit client ids when present', () => {
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
      clientId: 'request-client-id',
      userAgent: 'Browser A',
    });

    const entry = JSON.parse(lines[0]);
    expect(entry.clientIdHash).to.be.a('string').and.to.have.length.greaterThan(20);
    expect(JSON.stringify(entry)).not.contains('request-client-id');
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

  it('throttles repeated view events for the same client cluster', () => {
    const lines: Array<string> = [];
    let now = new Date('2026-06-14T10:00:00.000Z');
    const audit = newAccessAudit({
      enabled: true,
      viewThrottleMs: 1000,
      salt: 'test-salt',
      appendLine: (line) => lines.push(line),
      now: () => now,
    });

    const input = {
      event: 'player_view' as const,
      method: 'GET',
      path: 'api/player',
      gameId: 'g123',
      participantId: 'p123',
      participantKind: 'player' as const,
      clientIp: {address: '203.0.113.10', source: 'cf-connecting-ip' as const},
      userAgent: 'Browser A',
    };

    audit.record(input);
    now = new Date('2026-06-14T10:00:00.500Z');
    audit.record(input);
    now = new Date('2026-06-14T10:00:01.000Z');
    audit.record(input);

    expect(lines.map((line) => JSON.parse(line).ts)).deep.eq([
      '2026-06-14T10:00:00.000Z',
      '2026-06-14T10:00:01.000Z',
    ]);
  });

  it('does not throttle player input events', () => {
    const lines: Array<string> = [];
    const audit = newAccessAudit({
      enabled: true,
      viewThrottleMs: 1000,
      salt: 'test-salt',
      appendLine: (line) => lines.push(line),
      now: () => new Date('2026-06-14T10:00:00.000Z'),
    });

    const input = {
      event: 'player_input_accepted' as const,
      method: 'POST',
      path: 'player/input',
      gameId: 'g123',
      participantId: 'p123',
      participantKind: 'player' as const,
      clientIp: {address: '203.0.113.10', source: 'cf-connecting-ip' as const},
      userAgent: 'Browser A',
    };

    audit.record(input);
    audit.record(input);

    expect(lines.length).eq(2);
  });
});
