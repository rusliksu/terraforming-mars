import * as fs from 'fs';
import * as crypto from 'crypto';

export type AuditLogEntry = {
  ts: string;
  event: string;
  gameId?: string;
  participantId?: string;
  participantKind?: string;
  clientIdHash?: string;
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

export type AnalyzeAccessAuditOptions = {
  gameId?: string;
  since?: string;
  until?: string;
  redactClusters?: boolean;
  minSeverity?: 'high' | 'medium' | 'info';
};

type Bucket = {
  gameId: string;
  cluster: string;
  clusterKind: 'clientId' | 'ip';
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

function clusterFor(entry: AuditLogEntry): {cluster: string; clusterKind: Bucket['clusterKind']} | undefined {
  if (entry.gameId === undefined || entry.userAgentHash === undefined || entry.ts === undefined) {
    return undefined;
  }
  if (entry.clientIdHash !== undefined) {
    return {
      cluster: `client:${entry.clientIdHash}:${entry.userAgentHash}`,
      clusterKind: 'clientId',
    };
  }
  if (entry.ipHash !== undefined) {
    return {
      cluster: `${entry.ipHash}:${entry.userAgentHash}`,
      clusterKind: 'ip',
    };
  }
  return undefined;
}

function bucketFor(buckets: Map<string, Bucket>, entry: AuditLogEntry): Bucket | undefined {
  const cluster = clusterFor(entry);
  if (entry.gameId === undefined || cluster === undefined) {
    return undefined;
  }
  const key = `${entry.gameId}:${cluster.cluster}`;
  let bucket = buckets.get(key);
  if (bucket === undefined) {
    bucket = {
      gameId: entry.gameId,
      cluster: cluster.cluster,
      clusterKind: cluster.clusterKind,
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

function highReason(bucket: Bucket): string {
  if (bucket.clusterKind === 'clientId') {
    return 'same audit client id and user-agent submitted input for one player after viewing another player in the same game';
  }
  return 'same IP and user-agent submitted input for one player after viewing another player in the same game';
}

function mediumReason(bucket: Bucket): string {
  if (bucket.clusterKind === 'clientId') {
    return 'same audit client id and user-agent submitted input and opened spectator view in the same game';
  }
  return 'same IP and user-agent submitted input and opened spectator view in the same game';
}

function infoReason(bucket: Bucket): string {
  if (bucket.clusterKind === 'clientId') {
    return 'audit client id viewed player data but did not submit actions in this audit window';
  }
  return 'client viewed player data but did not submit actions in this audit window';
}

function isWithinWindow(entry: AuditLogEntry, options: AnalyzeAccessAuditOptions): boolean {
  if (options.gameId !== undefined && entry.gameId !== options.gameId) {
    return false;
  }
  if (options.since !== undefined || options.until !== undefined) {
    const entryTime = Date.parse(entry.ts);
    if (Number.isNaN(entryTime)) {
      return false;
    }
    if (options.since !== undefined && entryTime < Date.parse(options.since)) {
      return false;
    }
    if (options.until !== undefined && entryTime > Date.parse(options.until)) {
      return false;
    }
  }
  return true;
}

function clusterLabel(cluster: string, redact: boolean | undefined): string {
  if (redact !== true) {
    return cluster;
  }
  const digest = crypto.createHash('sha256').update(cluster).digest('hex').slice(0, 12);
  return `cluster-${digest}`;
}

function severityRank(severity: AuditFinding['severity']): number {
  return {high: 0, medium: 1, info: 2}[severity];
}

export function analyzeAccessAudit(entries: Array<AuditLogEntry>, options: AnalyzeAccessAuditOptions = {}): AuditReport {
  const buckets = new Map<string, Bucket>();

  for (const entry of entries) {
    if (!isWithinWindow(entry, options)) {
      continue;
    }
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
        cluster: clusterLabel(bucket.cluster, options.redactClusters),
        actedAs,
        viewedPlayers,
        spectatorViews,
        reason: highReason(bucket),
        firstSeen: bucket.firstSeen,
        lastSeen: bucket.lastSeen,
      });
      continue;
    }

    if (actedAs.length > 0 && spectatorViews.length > 0) {
      findings.push({
        severity: 'medium',
        gameId: bucket.gameId,
        cluster: clusterLabel(bucket.cluster, options.redactClusters),
        actedAs,
        viewedPlayers,
        spectatorViews,
        reason: mediumReason(bucket),
        firstSeen: bucket.firstSeen,
        lastSeen: bucket.lastSeen,
      });
      continue;
    }

    if (actedAs.length === 0 && viewedPlayers.length > 0) {
      findings.push({
        severity: 'info',
        gameId: bucket.gameId,
        cluster: clusterLabel(bucket.cluster, options.redactClusters),
        actedAs,
        viewedPlayers,
        spectatorViews,
        reason: infoReason(bucket),
        firstSeen: bucket.firstSeen,
        lastSeen: bucket.lastSeen,
      });
    }
  }

  const minRank = options.minSeverity === undefined ? severityRank('info') : severityRank(options.minSeverity);
  const filteredFindings = findings.filter((finding) => severityRank(finding.severity) <= minRank);

  filteredFindings.sort((a, b) => {
    return severityRank(a.severity) - severityRank(b.severity) || a.gameId.localeCompare(b.gameId) || a.firstSeen.localeCompare(b.firstSeen);
  });

  return {findings: filteredFindings};
}

export function readJsonl(filename: string): Array<AuditLogEntry> {
  return fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as AuditLogEntry);
}

function printUsage() {
  console.error([
    'Usage: node build/src/server/tools/access_audit_report.js <audit.jsonl> [options]',
    '',
    'Options:',
    '  --game <gameId>           Only report one game.',
    '  --since <iso>             Only include entries at or after this timestamp.',
    '  --until <iso>             Only include entries at or before this timestamp.',
    '  --redact-clusters         Replace clientIdHash/userAgentHash or ipHash/userAgentHash with stable report-local labels.',
    '  --min-severity <level>    Minimum severity to print: high, medium, or info.',
  ].join('\n'));
}

function parseCliArgs(argv: Array<string>): {filename?: string; options: AnalyzeAccessAuditOptions} {
  const [filename, ...args] = argv;
  const options: AnalyzeAccessAuditOptions = {};

  for (let idx = 0; idx < args.length; idx++) {
    const arg = args[idx];
    if (arg === '--game') {
      options.gameId = args[++idx];
    } else if (arg === '--since') {
      options.since = args[++idx];
    } else if (arg === '--until') {
      options.until = args[++idx];
    } else if (arg === '--redact-clusters') {
      options.redactClusters = true;
    } else if (arg === '--min-severity') {
      const level = args[++idx];
      if (level !== 'high' && level !== 'medium' && level !== 'info') {
        throw new Error(`Invalid --min-severity: ${level}`);
      }
      options.minSeverity = level;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return {filename, options};
}

if (require.main === module) {
  let parsed;
  try {
    parsed = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printUsage();
    process.exit(1);
  }

  if (parsed.filename === undefined) {
    printUsage();
    process.exit(1);
  }
  const report = analyzeAccessAudit(readJsonl(parsed.filename), parsed.options);
  console.log(JSON.stringify(report, null, 2));
}
