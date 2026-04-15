import {expect} from 'chai';
import fs from 'fs';
import {FileAPI, ServeAsset} from '../../src/server/routes/ServeAsset';
import {resolveEloAssetPath} from '../../src/server/elo/EloPaths';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {statusCode} from '../../src/common/http/statusCode';

class FileApiMock extends FileAPI {
  public counts = {
    readFile: 0,
    readFileSync: 0,
    existsSync: 0,
  };
  public constructor() {
    super();
  }
  public override readFileSync(path: string): Buffer {
    this.counts.readFileSync++;
    return Buffer.from('data: ' + path);
  }
  public override readFile(path: string): Promise<Buffer> {
    this.counts.readFile++;
    return Promise.resolve(Buffer.from('data: ' + path));
  }
  public override existsSync(_path: string): boolean {
    this.counts.existsSync++;
    return true;
  }
}

class MissingFileApiMock extends FileApiMock {
  public override readFile(path: string): Promise<Buffer> {
    const err = new Error('missing');
    (err as NodeJS.ErrnoException).code = 'ENOENT';
    return Promise.reject(err);
  }
}

describe('ServeAsset', () => {
  let instance: ServeAsset;
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;
  let fileApi: FileApiMock;
  // The expected state of call counts in most simple cases in this test. This is a template
  // used and overridden below. That makes how individual condition changes these calls.
  const primedCache = {
    readFile: 0,
    readFileSync: 3,
    existsSync: 0,
  };

  const storedNodeEnv = process.env.NODE_ENV;
  beforeEach(() => {
    instance = new ServeAsset(undefined, false);
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    fileApi = new FileApiMock();
  });
  afterEach(() => {
    process.env.NODE_ENV = storedNodeEnv;
  });
  it('bad filename', async () => {
    scaffolding.url = 'goo.goo.gaa.gaa';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found');
  });

  it('missing asset returns 404 instead of 500', async () => {
    instance = new ServeAsset(undefined, false, new MissingFileApiMock());
    scaffolding.url = '/assets/default_templates.json';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found');
  });

  it('index.html', async () => {
    scaffolding.url = '/assets/index.html';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content.startsWith('<!DOCTYPE html>'));
  });

  it('styles.css', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/styles.css';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/styles.css');
  });

  it('release.json alias', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/release.json';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: assets/release.json');
  });

  it('styles.css.gz', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/styles.css';
    scaffolding.req.headers['accept-encoding'] = 'gzip';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/styles.css.gz');
  });

  it('styles.css: uncached', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    // Primes the cache.
    expect(fileApi.counts).deep.eq(primedCache);

    scaffolding.url = '/styles.css';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);

    expect(res.content).eq('data: build/styles.css');
    expect(fileApi.counts).deep.eq({
      ...primedCache,
      readFile: 1, // Still read.
    });
  });

  it('styles.css.gz: cached', async () => {
    instance = new ServeAsset(undefined, true, fileApi);
    // Primes the cache.
    expect(fileApi.counts).deep.eq(primedCache);

    scaffolding.url = '/styles.css';
    scaffolding.req.headers['accept-encoding'] = 'gzip';
    await scaffolding.get(instance, res);

    expect(res.content).eq('data: build/styles.css.gz');
    expect(fileApi.counts).deep.eq({
      ...primedCache,
      readFile: 0, // Does not change
    });
  });

  it('development main.js', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/main.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/main.js');
    expect(res.headers.get('Cache-Control')).eq('no-cache, must-revalidate');
    expect(fileApi.counts).deep.eq({
      ...primedCache,
      readFile: 1,
      existsSync: 0,
    });
  });

  it('production main.js', async () => {
    process.env.NODE_ENV = 'production';
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/main.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/main.js');
    expect(res.headers.get('Cache-Control')).eq('no-cache, must-revalidate');
    expect(fileApi.counts).deep.eq({
      ...primedCache,
      readFile: 1,
      existsSync: 0,
    });
  });

  it('sw.js', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/sw.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/sw.js');
    expect(fileApi.counts).deep.eq({
      ...primedCache,
      readFile: 1,
      existsSync: 0,
    });
  });

  it('vendors.js', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/vendors.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/vendors.js');
    expect(res.headers.get('Cache-Control')).eq('no-cache, must-revalidate');
  });

  it('chunk js file', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/chunks/player-home.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/chunks/player-home.js');
    expect(res.headers.get('Cache-Control')).eq('no-cache, must-revalidate');
  });

  it('chunk js.map file', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/chunks/player-home.js.map';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/chunks/player-home.js.map');
    expect(res.headers.get('Cache-Control')).eq('no-cache, must-revalidate');
  });

  it('chunk js file with query string', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/chunks/player-home.js?v=release-123';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/chunks/player-home.js');
    expect(res.headers.get('Cache-Control')).eq('no-cache, must-revalidate');
  });

  it('rejects path traversal in chunks', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/chunks/../main.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.statusCode).eq(statusCode.notFound);
  });

  it('serves /elo/data.json from the elo asset path', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/elo/data.json?ts=123';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);

    expect(res.content).eq('data: ' + resolveEloAssetPath('elo/data.json'));
    expect(res.headers.get('Cache-Control')).eq('no-store');
  });

  it('serves svg assets from /assets', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/assets/board/gold_owner_cube.svg';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);

    expect(res.content).eq('data: ' + fs.realpathSync('assets/board/gold_owner_cube.svg'));
    expect(res.headers.get('Content-Type')).eq('image/svg+xml');
  });

  it('does not buffer-cache dynamic elo assets in production', async () => {
    instance = new ServeAsset(undefined, true, fileApi);
    scaffolding.url = '/elo/data.json';
    scaffolding.req.headers['accept-encoding'] = '';

    await scaffolding.get(instance, res);
    await scaffolding.get(instance, new MockResponse());

    expect(fileApi.counts.readFile).eq(2);
  });

  it('serves all script sources referenced in index.html', async () => {
    const html = fs.readFileSync('assets/index.html', 'utf8');
    const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    expect(srcs).to.not.be.empty;
    for (const src of srcs) {
      const perRes = new MockResponse();
      const perScaffolding = new RouteTestScaffolding();
      instance = new ServeAsset(undefined, false, fileApi);
      perScaffolding.url = '/' + src;
      perScaffolding.req.headers['accept-encoding'] = '';
      await perScaffolding.get(instance, perRes);
      expect(perRes.statusCode, `${src} should return 200`).eq(statusCode.ok);
    }
  });
});
