import {expect} from 'chai';
import {Handler} from '../../src/server/routes/Handler';
import {RouteError} from '../../src/server/routes/RouteError';
import {ErrorDiagnosticContext} from '../../src/server/server/SentryReporter';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {statusCode} from '../../src/common/http/statusCode';

type Captured = {error: unknown, context: ErrorDiagnosticContext};

class ThrowingHandler extends Handler {
  public constructor(private readonly failure: unknown, captureError: (error: unknown, context: ErrorDiagnosticContext) => void) {
    super({captureError});
  }

  public override async get(): Promise<void> {
    throw this.failure;
  }
}

describe('Handler', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;
  let captured: Array<Captured>;

  const capture = (error: unknown, context: ErrorDiagnosticContext) => {
    captured.push({error, context});
  };

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    captured = [];
  });

  it('reports an unexpected route failure answered with a 500', async () => {
    scaffolding.url = '/api/creategame?players=2';
    const failure = new Error('boom');
    await scaffolding.get(new ThrowingHandler(failure, capture), res);
    expect(res.statusCode).eq(statusCode.internalServerError);
    expect(captured).has.length(1);
    expect(captured[0].error).eq(failure);
    expect(captured[0].context).deep.eq({boundary: 'request', method: 'GET', route: '/api/creategame'});
  });

  it('reports a deliberate 500 RouteError', async () => {
    scaffolding.url = '/api/game?id=g1';
    const failure = RouteError.internalServerError('database is down');
    await scaffolding.get(new ThrowingHandler(failure, capture), res);
    expect(res.statusCode).eq(statusCode.internalServerError);
    expect(captured).has.length(1);
    expect(captured[0].error).eq(failure);
    expect(captured[0].context.route).eq('/api/game');
  });

  it('does not report errors the route answers with a 4xx', async () => {
    scaffolding.url = '/api/game';
    await scaffolding.get(new ThrowingHandler(RouteError.badRequest('nope'), capture), res);
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(captured).has.length(0);
  });

  it('still answers 500 when reporting itself fails', async () => {
    scaffolding.url = '/api/game';
    const failingCapture = () => {
      throw new Error('reporter is down');
    };
    await scaffolding.get(new ThrowingHandler(new Error('boom'), failingCapture), res);
    expect(res.statusCode).eq(statusCode.internalServerError);
  });
});
