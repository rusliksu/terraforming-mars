import {isIP} from 'node:net';
import fs from 'node:fs';
import {
  defaultStackParser,
  Event,
  ErrorEvent,
  Exception,
  makeNodeTransport,
  NodeClient,
  StackFrame,
} from '@sentry/node';

export type ErrorDiagnosticBoundary =
  'process' |
  'request' |
  'player-get' |
  'player-undo' |
  'player-input';

export interface ErrorDiagnosticContext {
  boundary: ErrorDiagnosticBoundary;
  method?: string;
  route?: string;
  gameId?: string;
  playerId?: string;
  gameplayInput?: unknown;
}

export interface ReporterRuntimeConfig {
  dsn?: string;
  environment?: string;
  releaseGitSha?: string;
}

export type ReporterTransport = ConstructorParameters<typeof NodeClient>[0]['transport'];

export interface SentryReporter {
  capture(error: unknown, context: ErrorDiagnosticContext): void;
  flush(timeout?: number): PromiseLike<boolean>;
  close(timeout?: number): PromiseLike<boolean>;
}

const MAX_GAMEPLAY_BYTES = 65_536;
const MAX_ERROR_STRING_BYTES = 8_192;
const MAX_OBJECT_DEPTH = 8;
const FILTERED = '[Filtered]';
const CIRCULAR = '[Circular]';
const MAX_DEPTH = '[MaxDepth]';
const UNREADABLE = '[Unreadable]';
const UNSUPPORTED = '[Unsupported]';
const VALID_RELEASE_GIT_SHA = /^[0-9a-f]{40}$/i;
const VALID_BOUNDARIES = new Set<string>([
  'process',
  'request',
  'player-get',
  'player-undo',
  'player-input',
]);
const VALID_METHODS = new Set<string>([
  'CONNECT',
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
  'TRACE',
]);
const DENIED_KEY_SUFFIXES = [
  'authorization',
  'cookie',
  'setcookie',
  'session',
  'sessionid',
  'password',
  'passwd',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'clientsecret',
  'dsn',
  'privatekey',
];

const disabledReporter: SentryReporter = {
  capture: (_error, _context) => undefined,
  flush: (_timeout) => Promise.resolve(true),
  close: (_timeout) => Promise.resolve(true),
};

function isDeniedKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return DENIED_KEY_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function sanitizeString(value: string): string {
  return value
    .replace(
      /-----BEGIN(?: [A-Z]+)* PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z]+)* PRIVATE KEY-----/g,
      FILTERED,
    )
    .replace(/^[ \t]*(Authorization|Cookie|Set-Cookie)\s*:\s*.*$/gim, `$1: ${FILTERED}`)
    .replace(/https?:\/\/[^@\s/:]+(?::[^@\s/]+)?@[^/\s]+\/[A-Za-z0-9_-]+/gi, FILTERED)
    .replace(/\bhttps?:\/\/[^\s]+/gi, (match: string) => {
      const privateComponent = match.search(/[?#]/);
      return privateComponent === -1 ? match : `${match.slice(0, privateComponent)}${FILTERED}`;
    })
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, `Bearer ${FILTERED}`)
    .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, FILTERED)
    .replace(
      /\b(password|passwd|secret|token|access[\s._-]?token|refresh[\s._-]?token|api[\s._-]?key|client[\s._-]?secret|dsn|private[\s._-]?key)\b\s*[:=]\s*[^\s,;]+/gi,
      `$1=${FILTERED}`,
    )
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, FILTERED)
    .replace(/(?<![A-Za-z0-9])\[?[A-Fa-f0-9:]{3,}\]?(?![A-Za-z0-9])/g, (match: string) => {
      const candidate = match.replace(/^\[/, '').replace(/\]$/, '');
      return isIP(candidate) === 6 ? FILTERED : match;
    });
}

function truncateUtf8(value: string, maximumBytes: number): string {
  if (Buffer.byteLength(value, 'utf8') <= maximumBytes) {
    return value;
  }

  const suffix = '[Truncated]';
  const codePoints = Array.from(value);
  let low = 0;
  let high = codePoints.length;
  while (low < high) {
    const candidate = Math.ceil((low + high) / 2);
    const truncated = `${codePoints.slice(0, candidate).join('')}${suffix}`;
    if (Buffer.byteLength(truncated, 'utf8') <= maximumBytes) {
      low = candidate;
    } else {
      high = candidate - 1;
    }
  }
  return `${codePoints.slice(0, low).join('')}${suffix}`;
}

function sanitizeAllowedString(value: string): string {
  return truncateUtf8(sanitizeString(value), MAX_ERROR_STRING_BYTES);
}

function sanitizeValue(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (depth > MAX_OBJECT_DEPTH) {
    return MAX_DEPTH;
  }
  if (value === null || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') {
    return sanitizeString(value.toString());
  }
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    return UNSUPPORTED;
  }
  if (value instanceof Date) {
    return sanitizeString(value.toISOString());
  }
  if (value instanceof Error) {
    return UNSUPPORTED;
  }
  if (seen.has(value)) {
    return CIRCULAR;
  }

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item, seen, depth + 1));
    }

    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      if (isDeniedKey(key) || key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      const sanitizedKey = truncateUtf8(sanitizeString(key), MAX_ERROR_STRING_BYTES);
      if (Object.prototype.hasOwnProperty.call(output, sanitizedKey)) {
        continue;
      }
      try {
        output[sanitizedKey] = sanitizeValue(
          (value as Record<string, unknown>)[key],
          seen,
          depth + 1,
        );
      } catch (_error) {
        output[sanitizedKey] = UNREADABLE;
      }
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function sanitizeGameplayInput(value: unknown): unknown {
  const sanitized = sanitizeValue(value, new WeakSet<object>(), 0);
  const serialized = JSON.stringify(sanitized);
  const originalBytes = Buffer.byteLength(serialized, 'utf8');
  if (originalBytes <= MAX_GAMEPLAY_BYTES) {
    return sanitized;
  }

  const codePoints = Array.from(serialized);
  let low = 0;
  let high = codePoints.length;
  let preview = '';
  while (low <= high) {
    const candidate = Math.floor((low + high) / 2);
    const candidatePreview = codePoints.slice(0, candidate).join('');
    const wrapper = {originalBytes, preview: candidatePreview, truncated: true};
    if (Buffer.byteLength(JSON.stringify(wrapper), 'utf8') <= MAX_GAMEPLAY_BYTES) {
      preview = candidatePreview;
      low = candidate + 1;
    } else {
      high = candidate - 1;
    }
  }
  return {originalBytes, preview, truncated: true};
}

function normalizeMethod(method: unknown): string | undefined {
  if (typeof method !== 'string') {
    return undefined;
  }
  const normalized = method.trim().toUpperCase();
  return VALID_METHODS.has(normalized) ? normalized : undefined;
}

function normalizeRoute(route: unknown): string | undefined {
  if (typeof route !== 'string' || route.trim() === '') {
    return undefined;
  }
  try {
    const pathname = new URL(route, 'http://reporter.invalid').pathname;
    return sanitizeAllowedString(pathname);
  } catch (_error) {
    return sanitizeAllowedString(route.split(/[?#]/, 1)[0]);
  }
}

function sanitizeFrame(frame: StackFrame): StackFrame {
  const output: StackFrame = {};
  const filename = frame.filename ?? frame.abs_path;
  if (typeof filename === 'string') {
    output.filename = sanitizeAllowedString(filename);
  }
  if (typeof frame.function === 'string') {
    output.function = sanitizeAllowedString(frame.function);
  }
  if (typeof frame.module === 'string') {
    output.module = sanitizeAllowedString(frame.module);
  }
  if (typeof frame.platform === 'string') {
    output.platform = sanitizeAllowedString(frame.platform);
  }
  if (typeof frame.lineno === 'number' && Number.isFinite(frame.lineno)) {
    output.lineno = frame.lineno;
  }
  if (typeof frame.colno === 'number' && Number.isFinite(frame.colno)) {
    output.colno = frame.colno;
  }
  if (typeof frame.in_app === 'boolean') {
    output.in_app = frame.in_app;
  }
  return output;
}

function exceptionFor(error: unknown): Exception {
  if (!(error instanceof Error)) {
    return {type: 'NonError', value: 'Non-Error thrown'};
  }

  let frames: StackFrame[] = [];
  try {
    if (typeof error.stack === 'string') {
      frames = defaultStackParser(error.stack).map(sanitizeFrame);
    }
  } catch (_error) {
    frames = [];
  }

  const exception: Exception = {
    type: sanitizeAllowedString(error.name || 'Error'),
    value: sanitizeAllowedString(error.message || 'Error'),
  };
  if (frames.length > 0) {
    exception.stacktrace = {frames};
  }
  return exception;
}

function isValidContext(context: unknown): context is ErrorDiagnosticContext {
  if (context === null || typeof context !== 'object') {
    return false;
  }
  const boundary = (context as {boundary?: unknown}).boundary;
  return typeof boundary === 'string' && VALID_BOUNDARIES.has(boundary);
}

function buildEvent(error: unknown, context: ErrorDiagnosticContext): Event {
  const tags: NonNullable<Event['tags']> = {
    'tm.boundary': context.boundary,
  };
  const event: Event = {
    level: 'error',
    platform: 'node',
    exception: {values: [exceptionFor(error)]},
    tags,
  };
  const request: NonNullable<Event['request']> = {};
  const method = normalizeMethod(context.method);
  const route = normalizeRoute(context.route);
  if (method !== undefined) {
    request.method = method;
  }
  if (route !== undefined) {
    request.url = route;
  }
  if (Object.prototype.hasOwnProperty.call(context, 'gameplayInput')) {
    request.data = sanitizeGameplayInput(context.gameplayInput);
  }
  if (Object.keys(request).length > 0) {
    event.request = request;
  }
  if (typeof context.gameId === 'string') {
    tags['tm.game_id'] = sanitizeAllowedString(context.gameId);
  }
  if (typeof context.playerId === 'string') {
    tags['tm.player_id'] = sanitizeAllowedString(context.playerId);
  }
  return event;
}

function allowlistedEvent(event: Event, release: string): ErrorEvent | null {
  const values = event.exception?.values;
  const boundary = event.tags?.['tm.boundary'];
  if (values === undefined || values.length === 0 ||
      typeof boundary !== 'string' || !VALID_BOUNDARIES.has(boundary)) {
    return null;
  }

  const tags: NonNullable<Event['tags']> = {
    'tm.boundary': boundary,
  };
  const output: Event = {
    environment: 'staging',
    release,
    level: 'error',
    platform: 'node',
    exception: {
      values: values.map((exception) => {
        const filtered: Exception = {
          type: sanitizeAllowedString(exception.type ?? 'Error'),
          value: sanitizeAllowedString(exception.value ?? 'Error'),
        };
        if (exception.stacktrace?.frames !== undefined) {
          filtered.stacktrace = {frames: exception.stacktrace.frames.map(sanitizeFrame)};
        }
        return filtered;
      }),
    },
    tags,
  };
  if (event.event_id !== undefined) {
    output.event_id = event.event_id;
  }
  if (event.timestamp !== undefined) {
    output.timestamp = event.timestamp;
  }
  if (event.sdk !== undefined) {
    output.sdk = event.sdk;
  }
  if (typeof event.tags?.['tm.game_id'] === 'string') {
    tags['tm.game_id'] = sanitizeAllowedString(event.tags['tm.game_id']);
  }
  if (typeof event.tags?.['tm.player_id'] === 'string') {
    tags['tm.player_id'] = sanitizeAllowedString(event.tags['tm.player_id']);
  }

  if (event.request !== undefined) {
    const request: NonNullable<Event['request']> = {};
    const method = normalizeMethod(event.request.method);
    const route = normalizeRoute(event.request.url);
    if (method !== undefined) {
      request.method = method;
    }
    if (route !== undefined) {
      request.url = route;
    }
    if (Object.prototype.hasOwnProperty.call(event.request, 'data')) {
      request.data = sanitizeGameplayInput(event.request.data);
    }
    if (Object.keys(request).length > 0) {
      output.request = request;
    }
  }
  return output as ErrorEvent;
}

function isEnabled(config: ReporterRuntimeConfig): config is Required<ReporterRuntimeConfig> {
  return typeof config.dsn === 'string' && config.dsn.trim() !== '' &&
    config.environment === 'staging' &&
    typeof config.releaseGitSha === 'string' && VALID_RELEASE_GIT_SHA.test(config.releaseGitSha);
}

export function readRuntimeReleaseGitSha(manifestPath = 'assets/release.json'): string | undefined {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    if (manifest.environment !== 'staging' || manifest.sourceTreeClean !== true ||
        typeof manifest.gitSha !== 'string' || !VALID_RELEASE_GIT_SHA.test(manifest.gitSha)) {
      return undefined;
    }
    return manifest.gitSha.toLowerCase();
  } catch (_error) {
    return undefined;
  }
}

export function createSentryReporter(
  config: ReporterRuntimeConfig,
  transport: ReporterTransport = makeNodeTransport,
): SentryReporter {
  if (!isEnabled(config)) {
    return disabledReporter;
  }

  try {
    const release = config.releaseGitSha.toLowerCase();
    const client = new NodeClient({
      dsn: config.dsn.trim(),
      environment: 'staging',
      release,
      enabled: true,
      integrations: [],
      transport,
      stackParser: defaultStackParser,
      skipOpenTelemetrySetup: true,
      registerEsmLoaderHooks: false,
      includeLocalVariables: false,
      sendDefaultPii: false,
      sendClientReports: false,
      attachStacktrace: false,
      enableLogs: false,
      enableMetrics: false,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: {request: false, response: false},
        httpBodies: [],
        queryParams: false,
        urlQueryParams: false,
        graphQL: {document: false, variables: false},
        genAI: {inputs: false, outputs: false},
        databaseQueryData: false,
        stackFrameVariables: false,
        frameContextLines: 0,
      },
      beforeSend: (event) => allowlistedEvent(event, release),
    });
    client.init();

    return {
      capture: (error, context) => {
        if (!isValidContext(context)) {
          return;
        }
        try {
          client.captureEvent(buildEvent(error, context));
        } catch (_error) {
          return;
        }
      },
      flush: (timeout) => client.flush(timeout),
      close: (timeout) => client.close(timeout),
    };
  } catch (_error) {
    return disabledReporter;
  }
}

const defaultReporter = createSentryReporter({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  releaseGitSha: readRuntimeReleaseGitSha(),
});

export function capture(error: unknown, context: ErrorDiagnosticContext): void {
  defaultReporter.capture(error, context);
}
