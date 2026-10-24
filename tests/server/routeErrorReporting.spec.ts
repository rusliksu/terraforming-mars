import {expect} from 'chai';
import {reportRouteError} from '../../src/server/server/routeErrorReporting';
import {ErrorDiagnosticContext} from '../../src/server/server/SentryReporter';

type Captured = {error: unknown, context: ErrorDiagnosticContext};

describe('reportRouteError', () => {
  let captured: Array<Captured>;

  const capture = (error: unknown, context: ErrorDiagnosticContext) => {
    captured.push({error, context});
  };

  beforeEach(() => {
    captured = [];
  });

  it('reports the request boundary, method and path', () => {
    const error = new Error('boom');
    reportRouteError(error, {method: 'post', url: '/api/creategame?players=2'}, capture);
    expect(captured).deep.eq([{
      error,
      context: {boundary: 'request', method: 'POST', route: '/api/creategame'},
    }]);
  });

  it('accepts an absolute url', () => {
    reportRouteError(new Error('boom'), {method: 'GET', url: 'http://website.com/api/game?id=g1'}, capture);
    expect(captured[0].context.route).eq('/api/game');
  });

  it('omits the route when the request has no url', () => {
    reportRouteError(new Error('boom'), {method: 'GET'}, capture);
    expect(captured[0].context).deep.eq({boundary: 'request', method: 'GET'});
  });

  it('never fails the response when the reporter throws', () => {
    const failing = () => {
      throw new Error('reporter is down');
    };
    expect(() => reportRouteError(new Error('boom'), {method: 'GET', url: '/x'}, failing)).to.not.throw();
    expect(captured).has.length(0);
  });
});
