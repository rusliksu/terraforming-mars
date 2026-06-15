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

  it('flags a client cluster that submits input and opens spectator view', () => {
    const report = analyzeAccessAudit([
      {
        ts: '2026-06-14T10:00:00.000Z',
        event: 'spectator_view',
        gameId: 'g1',
        participantId: 's-game',
        participantKind: 'spectator',
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
        severity: 'medium',
        gameId: 'g1',
        cluster: 'ip-a:ua-a',
        actedAs: ['p-red'],
        viewedPlayers: [],
        spectatorViews: ['s-game'],
        reason: 'same IP and user-agent submitted input and opened spectator view in the same game',
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

  it('does not echo raw IP fields into report findings', () => {
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
        rawIp: '203.0.113.10',
      } as any,
    ]);

    expect(JSON.stringify(report)).not.contains('203.0.113.10');
  });

  it('filters by game and time window before classifying findings', () => {
    const report = analyzeAccessAudit([
      {
        ts: '2026-06-14T09:59:59.000Z',
        event: 'player_view',
        gameId: 'g1',
        participantId: 'p-blue',
        participantKind: 'player',
        ipHash: 'ip-a',
        userAgentHash: 'ua-a',
      },
      {
        ts: '2026-06-14T10:00:00.000Z',
        event: 'player_view',
        gameId: 'g2',
        participantId: 'p-blue',
        participantKind: 'player',
        ipHash: 'ip-a',
        userAgentHash: 'ua-a',
      },
      {
        ts: '2026-06-14T10:01:00.000Z',
        event: 'player_view',
        gameId: 'g1',
        participantId: 'p-blue',
        participantKind: 'player',
        ipHash: 'ip-a',
        userAgentHash: 'ua-a',
      },
      {
        ts: '2026-06-14T10:02:00.000Z',
        event: 'player_input_accepted',
        gameId: 'g1',
        participantId: 'p-red',
        participantKind: 'player',
        ipHash: 'ip-a',
        userAgentHash: 'ua-a',
      },
      {
        ts: '2026-06-14T10:03:00.000Z',
        event: 'player_view',
        gameId: 'g1',
        participantId: 'p-green',
        participantKind: 'player',
        ipHash: 'ip-a',
        userAgentHash: 'ua-a',
      },
    ], {
      gameId: 'g1',
      since: '2026-06-14T10:00:00Z',
      until: '2026-06-14T10:02:00Z',
    });

    expect(report.findings).deep.eq([
      {
        severity: 'high',
        gameId: 'g1',
        cluster: 'ip-a:ua-a',
        actedAs: ['p-red'],
        viewedPlayers: ['p-blue'],
        spectatorViews: [],
        reason: 'same IP and user-agent submitted input for one player after viewing another player in the same game',
        firstSeen: '2026-06-14T10:01:00.000Z',
        lastSeen: '2026-06-14T10:02:00.000Z',
      },
    ]);
  });

  it('can redact cluster hashes and suppress info-only findings', () => {
    const report = analyzeAccessAudit([
      {
        ts: '2026-06-14T10:00:00.000Z',
        event: 'player_view',
        gameId: 'g1',
        participantId: 'p-red',
        participantKind: 'player',
        ipHash: 'ip-a',
        userAgentHash: 'ua-a',
      },
      {
        ts: '2026-06-14T10:01:00.000Z',
        event: 'player_view',
        gameId: 'g1',
        participantId: 'p-blue',
        participantKind: 'player',
        ipHash: 'ip-a',
        userAgentHash: 'ua-a',
      },
      {
        ts: '2026-06-14T10:02:00.000Z',
        event: 'player_input_accepted',
        gameId: 'g1',
        participantId: 'p-red',
        participantKind: 'player',
        ipHash: 'ip-a',
        userAgentHash: 'ua-a',
      },
      {
        ts: '2026-06-14T10:03:00.000Z',
        event: 'player_view',
        gameId: 'g1',
        participantId: 'p-green',
        participantKind: 'player',
        ipHash: 'ip-b',
        userAgentHash: 'ua-b',
      },
    ], {
      redactClusters: true,
      minSeverity: 'medium',
    });

    expect(report.findings).length(1);
    expect(report.findings[0].severity).eq('high');
    expect(report.findings[0].cluster).matches(/^cluster-[0-9a-f]{12}$/);
    expect(report.findings[0].cluster).not.contains('ip-a');
    expect(report.findings[0].cluster).not.contains('ua-a');
  });
});
