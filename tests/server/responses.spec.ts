import {expect} from 'chai';
import * as responses from '../../src/server/server/responses';
import {MockResponse} from '../routes/HttpMocks';
import {RouteTestScaffolding} from '../routes/RouteTestScaffolding';
import {statusCode} from '../../src/common/http/statusCode';

describe('Route', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
  });

  it('internalServerError hides error details in production', () => {
    withEnv({NODE_ENV: 'production', EXPOSE_INTERNAL_ERRORS: undefined}, () => {
      scaffolding.url = 'goo.goo.gaa.gaa';
      scaffolding.req.headers['accept-encoding'] = '';
      responses.internalServerError(scaffolding.req, res, {'<img src=x onerror=alert(1)>': 'foo'});
      expect(res.statusCode).eq(statusCode.internalServerError);
      expect(res.content).eq('Internal server error');
    });
  });

  it('internalServerError escapes error strings outside production', () => {
    withEnv({NODE_ENV: 'development', EXPOSE_INTERNAL_ERRORS: undefined}, () => {
      scaffolding.url = 'goo.goo.gaa.gaa';
      scaffolding.req.headers['accept-encoding'] = '';
      responses.internalServerError(scaffolding.req, res, '<img src=x onerror=alert(1)>');
      expect(res.statusCode).eq(statusCode.internalServerError);
      expect(res.content).eq('Internal server error: &lt;img src=x onerror=alert(1)&gt;');
    });
  });

  it('internalServerError can expose escaped details with an explicit flag', () => {
    withEnv({NODE_ENV: 'production', EXPOSE_INTERNAL_ERRORS: '1'}, () => {
      scaffolding.url = 'goo.goo.gaa.gaa';
      scaffolding.req.headers['accept-encoding'] = '';
      responses.internalServerError(scaffolding.req, res, new Error('<img src=x onerror=alert(1)>'));
      expect(res.statusCode).eq(statusCode.internalServerError);
      expect(res.content).eq('Internal server error: &lt;img src=x onerror=alert(1)&gt;');
    });
  });
});

function withEnv(values: Record<string, string | undefined>, fn: () => void): void {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    const value = values[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(previous)) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
