import {expect} from 'chai';
import {accessAuditWithClientId, newAccessAudit} from '../../src/server/server/AccessAudit';

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

  it('writes hashed client id when provided', () => {
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
      clientId: 'client-id-value',
      userAgent: 'Browser A',
    });

    const entry = JSON.parse(lines[0]);
    expect(entry.clientIdHash).to.be.a('string').and.to.have.length.greaterThan(20);
    expect(JSON.stringify(entry)).not.contains('client-id-value');
  });

  it('can attach a request client id to audit records', () => {
    const events: Array<any> = [];
    const audit = accessAuditWithClientId({
      record: (input) => events.push(input),
    }, 'request-client-id');

    audit.record({
      event: 'player_view',
      method: 'GET',
      path: 'api/player',
      participantKind: 'player',
      clientIp: {address: '203.0.113.10', source: 'cf-connecting-ip'},
    });

    expect(events[0].clientId).eq('request-client-id');
  });
});
