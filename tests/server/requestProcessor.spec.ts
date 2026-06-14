import {expect} from 'chai';
import {statusCode} from '../../src/common/http/statusCode';
import {GameLoader} from '../../src/server/database/GameLoader';
import {Context} from '../../src/server/routes/IHandler';
import {ServeAsset} from '../../src/server/routes/ServeAsset';
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

  it('routes release.json to the asset handler', async () => {
    const originalGetInstance = GameLoader.getInstance;
    const originalProcessRequest = ServeAsset.INSTANCE.processRequest.bind(ServeAsset.INSTANCE);
    let assetHandlerCalled = false;

    (GameLoader as typeof GameLoader & {getInstance: typeof GameLoader.getInstance}).getInstance = (() => {
      return {} as ReturnType<typeof GameLoader.getInstance>;
    }) as typeof GameLoader.getInstance;

    ServeAsset.INSTANCE.processRequest = ((_req, res, _ctx) => {
      assetHandlerCalled = true;
      res.writeHead(statusCode.ok);
      res.end('release manifest');
    }) as typeof ServeAsset.INSTANCE.processRequest;

    const req = new MockRequest();
    const res = new MockResponse();
    req.headers.host = 'tm.knightbyte.win';
    req.headers['accept-encoding'] = '';
    req.url = '/release.json';

    try {
      processRequest(req, res);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(assetHandlerCalled).eq(true);
      expect(res.statusCode).eq(statusCode.ok);
      expect(res.content).eq('release manifest');
    } finally {
      ServeAsset.INSTANCE.processRequest = originalProcessRequest;
      (GameLoader as typeof GameLoader & {getInstance: typeof GameLoader.getInstance}).getInstance = originalGetInstance;
    }
  });

  it('passes the trusted client IP through the request context', async () => {
    const originalGetInstance = GameLoader.getInstance;
    const originalProcessRequest = ServeAsset.INSTANCE.processRequest.bind(ServeAsset.INSTANCE);
    let observedCtx: Context | undefined;

    (GameLoader as typeof GameLoader & {getInstance: typeof GameLoader.getInstance}).getInstance = (() => {
      return {} as ReturnType<typeof GameLoader.getInstance>;
    }) as typeof GameLoader.getInstance;

    ServeAsset.INSTANCE.processRequest = ((_req, res, ctx) => {
      observedCtx = ctx;
      res.writeHead(statusCode.ok);
      res.end('release manifest');
    }) as typeof ServeAsset.INSTANCE.processRequest;

    const req = new MockRequest();
    const res = new MockResponse();
    req.headers.host = 'tm.knightbyte.win';
    req.headers['accept-encoding'] = '';
    req.headers['cf-connecting-ip'] = '203.0.113.10';
    req.url = '/release.json';

    try {
      processRequest(req, res);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(observedCtx?.ip).eq('203.0.113.10');
      expect(observedCtx?.clientIp).deep.eq({
        address: '203.0.113.10',
        source: 'cf-connecting-ip',
      });
    } finally {
      ServeAsset.INSTANCE.processRequest = originalProcessRequest;
      (GameLoader as typeof GameLoader & {getInstance: typeof GameLoader.getInstance}).getInstance = originalGetInstance;
    }
  });
});
