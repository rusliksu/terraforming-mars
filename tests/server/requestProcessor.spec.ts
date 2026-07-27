import {expect} from 'chai';
import prometheus from 'prom-client';
import {statusCode} from '../../src/common/http/statusCode';
import {GameLoader} from '../../src/server/database/GameLoader';
import {Context} from '../../src/server/routes/IHandler';
import {ServeAsset} from '../../src/server/routes/ServeAsset';
import {processRequest} from '../../src/server/server/requestProcessor';
import {MockRequest, MockResponse} from '../routes/HttpMocks';

async function getLatencyCount(path: string): Promise<number> {
  const metric = prometheus.register.getSingleMetric('http_request_latency');
  if (metric === undefined) {
    return 0;
  }
  const data = await metric.get();
  return data.values.find((value) => {
    const metricValue = value as {metricName?: string, labels: Record<string, string>, value: number};
    return metricValue.metricName === 'http_request_latency_count' &&
      metricValue.labels.path === path;
  })?.value ?? 0;
}

describe('requestProcessor', () => {
  it('routes a request from an allowed IP to a handler', async () => {
    // The default MockRequest socket address (127.0.0.1) is not on the blocklist.
    const req = new MockRequest();
    const res = new MockResponse();
    req.url = '/';
    await processRequest(req, res);

    expect(req.url).eq('/assets/index.html');
  });

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
      await processRequest(req, res);
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
      await processRequest(req, res);
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
      await processRequest(req, res);
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

  it('records latency after an async handler finishes', async () => {
    const originalGetInstance = GameLoader.getInstance;
    const originalProcessRequest = ServeAsset.INSTANCE.processRequest.bind(ServeAsset.INSTANCE);
    let finishHandler: (() => void) | undefined;

    (GameLoader as typeof GameLoader & {getInstance: typeof GameLoader.getInstance}).getInstance = (() => {
      return {} as ReturnType<typeof GameLoader.getInstance>;
    }) as typeof GameLoader.getInstance;

    ServeAsset.INSTANCE.processRequest = ((_req, res, _ctx) => {
      return new Promise<void>((resolve) => {
        finishHandler = () => {
          res.writeHead(statusCode.ok);
          res.end('delayed asset');
          resolve();
        };
      });
    }) as typeof ServeAsset.INSTANCE.processRequest;

    const req = new MockRequest();
    const res = new MockResponse();
    req.headers.host = 'tm.knightbyte.win';
    req.headers['accept-encoding'] = '';
    req.url = '/release.json';

    try {
      const before = await getLatencyCount('release.json');
      const processPromise = processRequest(req, res);
      expect(await getLatencyCount('release.json')).eq(before);

      finishHandler?.();
      await processPromise;

      expect(res.statusCode).eq(statusCode.ok);
      expect(res.content).eq('delayed asset');
      expect(await getLatencyCount('release.json')).eq(before + 1);
    } finally {
      ServeAsset.INSTANCE.processRequest = originalProcessRequest;
      (GameLoader as typeof GameLoader & {getInstance: typeof GameLoader.getInstance}).getInstance = originalGetInstance;
    }
  });

  it('waits for the routed handler to finish writing the response before returning', async () => {
    // ServeAsset reads the file asynchronously, so this exercises a handler
    // that suspends on a real await before writing headers/body.
    const req = new MockRequest();
    const res = new MockResponse();
    req.url = '/';

    await processRequest(req, res);

    expect(res.content.length).greaterThan(0);
    expect(res.getHeader('Content-Length')).eq(res.content.length);
  });
});
