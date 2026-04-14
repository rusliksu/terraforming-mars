import {expect} from 'chai';
import {statusCode} from '../../src/common/http/statusCode';
import {GameLoader} from '../../src/server/database/GameLoader';
import {processRequest} from '../../src/server/server/requestProcessor';
import {MockRequest, MockResponse} from '../routes/HttpMocks';

describe('requestProcessor', () => {
  it('routes sw.js to the asset handler', async () => {
    const originalGetInstance = GameLoader.getInstance;
    (GameLoader as typeof GameLoader & {getInstance: typeof GameLoader.getInstance}).getInstance = (() => {
      return {} as ReturnType<typeof GameLoader.getInstance>;
    }) as typeof GameLoader.getInstance;

    const req = new MockRequest();
    const res = new MockResponse();
    req.headers.host = 'tm.knightbyte.win';
    req.headers['accept-encoding'] = '';
    req.url = '/sw.js';

    try {
      processRequest(req, res);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(res.statusCode).eq(statusCode.ok);
    } finally {
      (GameLoader as typeof GameLoader & {getInstance: typeof GameLoader.getInstance}).getInstance = originalGetInstance;
    }
  });
});
