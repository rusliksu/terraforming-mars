import {expect} from 'chai';
import {NodeClient} from '@sentry/node';
import {
  createSentryReporter,
  ErrorDiagnosticContext,
  ReporterRuntimeConfig,
  ReporterTransport,
  SentryReporter,
} from '../../../src/server/server/SentryReporter';

type EnvelopeItem = [Record<string, unknown>, unknown];
type Envelope = [Record<string, unknown>, EnvelopeItem[]];

const ENABLED_CONFIG: ReporterRuntimeConfig = {
  dsn: 'https://public@example.invalid/1',
  environment: 'staging',
  buildHead: 'deadbeef',
};

class FakeTransport {
  public readonly envelopes: Envelope[] = [];
  public initializations = 0;
  public sends = 0;
  public rejectSends = false;

  public readonly factory: ReporterTransport = (_options) => {
    this.initializations++;
    return {
      send: (envelope) => {
        this.sends++;
        this.envelopes.push(envelope as Envelope);
        if (this.rejectSends) {
          return Promise.reject(new Error('synthetic transport failure'));
        }
        return Promise.resolve({statusCode: 200});
      },
      flush: () => Promise.resolve(true),
    };
  };

  public events(): Record<string, unknown>[] {
    return this.envelopes.flatMap((envelope) => {
      return envelope[1]
        .filter((item) => item[0].type === 'event')
        .map((item) => item[1] as Record<string, unknown>);
    });
  }

  public itemTypes(): unknown[] {
    return this.envelopes.flatMap((envelope) => envelope[1].map((item) => item[0].type));
  }
}

function asObject(value: unknown): Record<string, unknown> {
  expect(value).to.be.an('object');
  expect(value).not.eq(null);
  return value as Record<string, unknown>;
}

function expectOnlyKeys(value: Record<string, unknown>, allowed: string[]): void {
  for (const key of Object.keys(value)) {
    expect(allowed, `unexpected key: ${key}`).contains(key);
  }
}

function eventRequest(event: Record<string, unknown>): Record<string, unknown> {
  return asObject(event.request);
}

function firstException(event: Record<string, unknown>): Record<string, unknown> {
  const exception = asObject(event.exception);
  const values = exception.values as unknown[];
  expect(values).to.be.an('array').and.not.empty;
  return asObject(values[0]);
}

describe('SentryReporter', () => {
  const reporters: SentryReporter[] = [];

  afterEach(async () => {
    for (const reporter of reporters.splice(0)) {
      await reporter.close();
    }
  });

  function makeReporter(
    config: ReporterRuntimeConfig = ENABLED_CONFIG,
    fake: FakeTransport = new FakeTransport(),
  ): {reporter: SentryReporter, fake: FakeTransport} {
    const reporter = createSentryReporter(config, fake.factory);
    reporters.push(reporter);
    return {reporter, fake};
  }

  it('remains disabled unless all three activation conditions match', async () => {
    const disabledConfigs: ReporterRuntimeConfig[] = [
      {...ENABLED_CONFIG, dsn: undefined},
      {...ENABLED_CONFIG, dsn: '   '},
      {...ENABLED_CONFIG, environment: 'production'},
      {...ENABLED_CONFIG, environment: 'Staging'},
      {...ENABLED_CONFIG, buildHead: undefined},
      {...ENABLED_CONFIG, buildHead: 'n/a'},
      {...ENABLED_CONFIG, buildHead: 'not-a-revision'},
    ];

    for (const config of disabledConfigs) {
      const {reporter, fake} = makeReporter(config);
      reporter.capture(new Error('disabled'), {boundary: 'process'});
      await reporter.flush();
      expect(fake.initializations).eq(0);
      expect(fake.events()).deep.eq([]);
    }
  });

  it('enables only for DSN, exact staging, and a valid hex build head', async () => {
    const {reporter, fake} = makeReporter();

    reporter.capture(new Error('enabled'), {boundary: 'process'});
    await reporter.flush();

    expect(fake.initializations).eq(1);
    expect(fake.events()).to.have.length(1);
  });

  it('routes the public capture function through its configured default reporter', () => {
    const modulePath = require.resolve('../../../src/server/server/SentryReporter');
    const cachedModule = require.cache[modulePath];
    const originalDsn = process.env.SENTRY_DSN;
    const originalEnvironment = process.env.SENTRY_ENVIRONMENT;
    const originalCaptureEvent = Object.getOwnPropertyDescriptor(NodeClient.prototype, 'captureEvent');
    let capturedEvents = 0;

    try {
      process.env.SENTRY_DSN = 'https://public@example.invalid/1';
      process.env.SENTRY_ENVIRONMENT = 'staging';
      NodeClient.prototype.captureEvent = ((_event) => {
        capturedEvents++;
        return 'synthetic-event-id';
      }) as NodeClient['captureEvent'];
      delete require.cache[modulePath];
      const isolatedReporter = require(modulePath) as typeof import('../../../src/server/server/SentryReporter');

      isolatedReporter.capture(new Error('public capture'), {boundary: 'process'});

      expect(capturedEvents).eq(1);
    } finally {
      if (originalCaptureEvent === undefined) {
        Reflect.deleteProperty(NodeClient.prototype, 'captureEvent');
      } else {
        Object.defineProperty(NodeClient.prototype, 'captureEvent', originalCaptureEvent);
      }
      delete require.cache[modulePath];
      if (cachedModule !== undefined) {
        require.cache[modulePath] = cachedModule;
      }
      if (originalDsn === undefined) {
        delete process.env.SENTRY_DSN;
      } else {
        process.env.SENTRY_DSN = originalDsn;
      }
      if (originalEnvironment === undefined) {
        delete process.env.SENTRY_ENVIRONMENT;
      } else {
        process.env.SENTRY_ENVIRONMENT = originalEnvironment;
      }
    }
  });

  it('falls back to a disabled reporter when SDK transport initialization fails', () => {
    const throwingTransport: ReporterTransport = (_options) => {
      throw new Error('synthetic initialization failure');
    };
    const reporter = createSentryReporter(ENABLED_CONFIG, throwingTransport);
    reporters.push(reporter);

    expect(() => reporter.capture(new Error('ignored'), {boundary: 'process'})).not.throw();
  });

  it('requires a valid boundary at compile time and runtime', async () => {
    const {reporter, fake} = makeReporter();

    if (process.env.NODE_ENV === '__sentry_reporter_typecheck__') {
      // @ts-expect-error The public context always requires boundary.
      reporter.capture(new Error('missing boundary'), {});
      // @ts-expect-error Raw request objects are outside the public contract.
      reporter.capture(new Error('raw request'), {boundary: 'request', request: {headers: {}}});
    }

    reporter.capture(new Error('runtime missing boundary'), {} as ErrorDiagnosticContext);
    await reporter.flush();
    expect(fake.events()).deep.eq([]);
  });

  it('sends one allowlisted event with the full parsed call chain and gameplay context', async () => {
    const {reporter, fake} = makeReporter();
    const error = new TypeError('card action failed');
    error.stack = [
      'TypeError: card action failed',
      '    at playCard (C:\\app\\PlayerInput.js:41:9)',
      '    at processInput (C:\\app\\requestProcessor.js:88:17)',
      '    at dispatch (C:\\app\\server.js:12:3)',
    ].join('\n');

    reporter.capture(error, {
      boundary: 'player-input',
      method: 'post',
      route: '/player/input?token=must-not-survive#fragment',
      gameId: 'g-42',
      playerId: 'p-7',
      gameplayInput: {amount: 2, card: 'Asteroid'},
    });
    await reporter.flush();

    const events = fake.events();
    expect(events).to.have.length(1);
    const event = events[0];
    expect(event.environment).eq('staging');
    expect(event.release).eq('deadbeef');
    expect(event.level).eq('error');
    expect(event.platform).eq('node');

    const exception = firstException(event);
    expect(exception.type).eq('TypeError');
    expect(exception.value).eq('card action failed');
    const stacktrace = asObject(exception.stacktrace);
    const frames = stacktrace.frames as unknown[];
    expect(frames).to.have.length(3);
    expect(JSON.stringify(frames)).contains('playCard');
    expect(JSON.stringify(frames)).contains('processInput');
    expect(JSON.stringify(frames)).contains('dispatch');

    const request = eventRequest(event);
    expect(request).deep.eq({
      data: {amount: 2, card: 'Asteroid'},
      method: 'POST',
      url: '/player/input',
    });
    expect(event.tags).deep.eq({
      'tm.boundary': 'player-input',
      'tm.game_id': 'g-42',
      'tm.player_id': 'p-7',
    });
    expect(fake.sends).eq(1);
  });

  it('uses a neutral exception for a thrown non-Error without serializing it', async () => {
    const {reporter, fake} = makeReporter();
    const sentinel = 'NON_ERROR_PRIVATE_SENTINEL';

    reporter.capture({secret: sentinel, nested: {value: sentinel}}, {boundary: 'request'});
    await reporter.flush();

    const event = fake.events()[0];
    const exception = firstException(event);
    expect(exception.type).eq('NonError');
    expect(exception.value).eq('Non-Error thrown');
    expect(JSON.stringify(event)).not.contains(sentinel);
  });

  it('redacts supported secret formats in errors, stacks, and nested gameplay input', async () => {
    const {reporter, fake} = makeReporter();
    const sentinels = [
      'MSG_AUTH_SENTINEL',
      'MSG_COOKIE_SENTINEL',
      'MSG_SET_COOKIE_SENTINEL',
      'LEADING_AUTH_SENTINEL',
      'LEADING_COOKIE_SENTINEL',
      'DOTTED_API_KEY_SENTINEL',
      'DOTTED_PRIVATE_KEY_SENTINEL',
      'QUERY_SENTINEL',
      'FRAGMENT_SENTINEL',
      'BEARER_SENTINEL',
      'JWT_PAYLOAD_SENTINEL',
      'DSN_SECRET_SENTINEL',
      'PASSWORD_SENTINEL',
      'PEM_PRIVATE_SENTINEL',
      'NESTED_AUTH_SENTINEL',
      'NESTED_COOKIE_SENTINEL',
      'NESTED_SESSION_SENTINEL',
      'NESTED_PASSWORD_SENTINEL',
      'NESTED_SECRET_SENTINEL',
      'NESTED_TOKEN_SENTINEL',
      'NESTED_API_KEY_SENTINEL',
      'NESTED_DSN_SENTINEL',
      'NESTED_PRIVATE_KEY_SENTINEL',
      'CAUSE_SENTINEL',
      'THROWABLE_PROPERTY_SENTINEL',
      '203.0.113.42',
      '2001:db8::42',
    ];
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.JWT_PAYLOAD_SENTINEL.signature';
    const error = new Error([
      'visible-neighbor',
      'Authorization: MSG_AUTH_SENTINEL',
      'Cookie: MSG_COOKIE_SENTINEL',
      'Set-Cookie: MSG_SET_COOKIE_SENTINEL',
      '  Authorization: LEADING_AUTH_SENTINEL',
      '\tCookie: LEADING_COOKIE_SENTINEL',
      'api.key=DOTTED_API_KEY_SENTINEL',
      'private.key=DOTTED_PRIVATE_KEY_SENTINEL',
      'url=https://example.invalid/play?secret=QUERY_SENTINEL#FRAGMENT_SENTINEL',
      'ipv4=203.0.113.42 ipv6=2001:db8::42',
      'Bearer BEARER_SENTINEL',
      jwt,
      'dsn=https://public:DSN_SECRET_SENTINEL@sentry.invalid/42',
      'password=PASSWORD_SENTINEL',
      '-----BEGIN PRIVATE KEY-----',
      'PEM_PRIVATE_SENTINEL',
      '-----END PRIVATE KEY-----',
    ].join('\n'));
    (error as Error & {cause?: unknown}).cause = new Error('CAUSE_SENTINEL');
    error.name = 'Failure token=BEARER_SENTINEL';
    error.stack = [
      `Error: ${error.message}`,
      '    at visibleFunction (C:\\app\\203.0.113.42\\input.js:10:2)',
      '    at anotherFunction (C:\\app\\server.js:20:4)',
    ].join('\n');
    (error as Error & {privateState: string}).privateState = 'THROWABLE_PROPERTY_SENTINEL';

    const cyclic: Record<string, unknown> = {safe: 'cycle-neighbor'};
    cyclic.self = cyclic;
    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let index = 0; index < 20; index++) {
      const next: Record<string, unknown> = {};
      cursor.next = next;
      cursor = next;
    }

    reporter.capture(error, {
      boundary: 'player-undo',
      method: 'POST',
      route: '/undo?QUERY_SENTINEL#FRAGMENT_SENTINEL',
      gameId: 'game-visible',
      playerId: 'player-visible',
      gameplayInput: {
        'allowedNeighbor': 'visible-gameplay-neighbor',
        'Authorization': 'NESTED_AUTH_SENTINEL',
        'set_cookie': 'NESTED_COOKIE_SENTINEL',
        'SESSION-ID': 'NESTED_SESSION_SENTINEL',
        'PassWord': 'NESTED_PASSWORD_SENTINEL',
        'client.secret': 'NESTED_SECRET_SENTINEL',
        'access_token': 'NESTED_TOKEN_SENTINEL',
        'API-Key': 'NESTED_API_KEY_SENTINEL',
        'dsn': 'NESTED_DSN_SENTINEL',
        'private_key': 'NESTED_PRIVATE_KEY_SENTINEL',
        'cyclic': cyclic,
        'deep': deep,
      },
    });
    await reporter.flush();

    const event = fake.events()[0];
    const serialized = JSON.stringify(event);
    for (const sentinel of sentinels) {
      expect(serialized, `leaked sentinel: ${sentinel}`).not.contains(sentinel);
    }
    expect(serialized).contains('[Filtered]');
    expect(serialized).contains('[Circular]');
    expect(serialized).contains('[MaxDepth]');
    expect(serialized).contains('visible-neighbor');
    expect(serialized).contains('visible-gameplay-neighbor');
    expect(serialized).contains('cycle-neighbor');

    expectOnlyKeys(event, [
      'environment',
      'event_id',
      'exception',
      'level',
      'platform',
      'release',
      'request',
      'sdk',
      'tags',
      'timestamp',
    ]);
    const exception = firstException(event);
    expectOnlyKeys(exception, ['stacktrace', 'type', 'value']);
    const frames = asObject(exception.stacktrace).frames as Record<string, unknown>[];
    for (const frame of frames) {
      expectOnlyKeys(frame, ['colno', 'filename', 'function', 'in_app', 'lineno', 'module', 'platform']);
    }

    expect(event).not.have.property('contexts');
    expect(event).not.have.property('user');
    expect(event).not.have.property('breadcrumbs');
    expect(event).not.have.property('spans');
    expect(event).not.have.property('transaction');
    const request = eventRequest(event);
    expect(request).not.have.property('headers');
    expect(request).not.have.property('cookies');
    expect(request).not.have.property('query_string');
    expect(request.url).eq('/undo');
    expect(fake.itemTypes()).deep.eq(['event']);
  });

  it('produces a deterministic UTF-8-safe truncation wrapper within 65,536 bytes', async () => {
    const huge = '🚀'.repeat(40_000);
    const gameplayInput = {huge, label: 'visible'};
    const expectedFilteredJson = JSON.stringify({huge, label: 'visible'});
    const expectedOriginalBytes = Buffer.byteLength(expectedFilteredJson, 'utf8');
    const first = makeReporter();
    const second = makeReporter();

    first.reporter.capture(new Error('oversized'), {boundary: 'player-input', gameplayInput});
    second.reporter.capture(new Error('oversized'), {boundary: 'player-input', gameplayInput});
    await first.reporter.flush();
    await second.reporter.flush();

    const firstData = eventRequest(first.fake.events()[0]).data;
    const secondData = eventRequest(second.fake.events()[0]).data;
    const wrapper = asObject(firstData);
    const wrapperJson = JSON.stringify(wrapper);
    expect(wrapper.truncated).eq(true);
    expect(wrapper.originalBytes).eq(expectedOriginalBytes);
    expect(wrapper.preview).to.be.a('string');
    expect(Buffer.byteLength(wrapperJson, 'utf8')).at.most(65_536);
    expect(JSON.stringify(secondData)).eq(wrapperJson);

    const preview = wrapper.preview as string;
    expect(Buffer.from(preview, 'utf8').toString('utf8')).eq(preview);
    const lastCodeUnit = preview.charCodeAt(preview.length - 1);
    expect(lastCodeUnit < 0xD800 || lastCodeUnit > 0xDBFF).eq(true);
  });

  it('does not let a transport failure escape to the caller', async () => {
    const fake = new FakeTransport();
    fake.rejectSends = true;
    const {reporter} = makeReporter(ENABLED_CONFIG, fake);

    expect(() => reporter.capture(new Error('transport failure'), {boundary: 'process'})).not.throw();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(fake.sends).eq(1);
  });
});
