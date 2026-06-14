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

function bucketFor(buckets: Map<string, Bucket>, entry: AuditLogEntry): Bucket | undefined {
  if (entry.gameId === undefined || entry.ipHash === undefined || entry.userAgentHash === undefined || entry.ts === undefined) {
    return undefined;
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
  return bucket;
}

export function analyzeAccessAudit(entries: Array<AuditLogEntry>): AuditReport {
  const buckets = new Map<string, Bucket>();

  for (const entry of entries) {
    const bucket = bucketFor(buckets, entry);
    if (bucket === undefined) {
      continue;
    }

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
    console.error('Usage: node build/src/server/tools/access_audit_report.js <audit.jsonl>');
    process.exit(1);
  }
  const report = analyzeAccessAudit(readJsonl(filename));
  console.log(JSON.stringify(report, null, 2));
}
