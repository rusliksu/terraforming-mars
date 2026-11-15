import fs from 'fs';
import path from 'path';
import * as responses from '../server/responses';

import {Context} from './IHandler';
import {BufferCache} from './BufferCache';
import {ContentType} from './ContentType';
import {Handler} from './Handler';
import {isProduction} from '../utils/server';
import {Request} from '../Request';
import {Response} from '../Response';
import {isDynamicEloAssetPath, resolveEloAssetPath} from '../elo/EloPaths';
import {RouteError} from './RouteError';

type Encoding = 'gzip' | 'br';
type ErrnoLikeError = Error & { code?: string };

// Map of logical asset name ("main.js") to the content-hashed file name ("main.<hash>.js")
// written by scripts/emit-asset-manifest.js.
type AssetManifest = {[logicalName: string]: string};
const ASSET_MANIFEST_PATH = 'build/asset-manifest.json';
const MANIFEST_ASSET_NAMES = ['main.js', 'vendors.js', 'styles.css'];

export class FileAPI {
  public static readonly INSTANCE: FileAPI = new FileAPI();

  protected constructor() {}

  public readFileSync(path: string): Buffer {
    return fs.readFileSync(path);
  }
  public readFile(path: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  public existsSync(path: string): boolean {
    return fs.existsSync(path);
  }
}
export class ServeAsset extends Handler {
  public static readonly INSTANCE: ServeAsset = new ServeAsset();
  private readonly cache = new BufferCache();
  private assetVersion: string | undefined;
  private assetManifest: AssetManifest | undefined;

  // Public for tests
  public constructor(private cacheAgeSeconds: string | number = process.env.ASSET_CACHE_MAX_AGE || 0,
    // only production caches resources
    private cacheAssets: boolean = isProduction(),
    private fileApi: FileAPI = FileAPI.INSTANCE) {
    super();
    this.assetManifest = this.readAssetManifestSync();
    // Prime the cache with the stylesheet and its compressed copies. A missing file is not
    // fatal here: the request itself reports a 404, and tests/dev can run without a build.
    const stylesFile = `build/${this.assetManifest?.['styles.css'] ?? 'styles.css'}`;
    for (const file of [stylesFile, `${stylesFile}.gz`, `${stylesFile}.br`]) {
      try {
        this.cache.set(file, fileApi.readFileSync(file));
      } catch (_err) {
        // Ignore missing files here; see the comment above.
      }
    }
  }

  public override async get(req: Request, res: Response, _ctx: Context): Promise<void> {
    if (req.url === undefined) {
      throw RouteError.internalServerError('no url on request');
    }

    // Remove leading slash and query parameters.
    const path = req.url.substring(1).split('?')[0];
    // The ELO page uses relative data URLs, so it must live under a trailing slash.
    // /solo has never had its own page; the public rating table is the closest useful
    // destination, and this keeps old bookmarks from ending on a 404.
    if (path === 'elo-data/' || path === 'solo-records/') {
      res.statusCode = 301;
      res.setHeader('Location', path === 'elo-data/' ? '/elo-data' : '/solo-records');
      res.end();
      return;
    }
    if ((path === 'elo' || path === 'solo' || path.startsWith('solo/')) &&
        path !== 'solo/elo-data' && path !== 'solo/elo-data/' &&
        path !== 'solo/solo-records' && path !== 'solo/solo-records/') {
      res.statusCode = 301;
      res.setHeader('Location', '/elo/');
      res.end();
      return;
    }
    // The ELO page treats these as optional additions. Keep the browser console
    // clean when the deployment has no solo/stats snapshot yet.
    if (path === 'elo/solo-records.json' || path === 'solo-records.json' || path === 'solo-records' ||
        path === 'solo/solo-records' || path === 'solo/solo-records/' || path === 'elo/stats.json') {
      const optionalFile = resolveEloAssetPath(path);
      if (optionalFile !== undefined && !this.fileApi.existsSync(optionalFile)) {
        const body = path.endsWith('solo-records.json') || path === 'solo-records' ||
          path === 'solo/solo-records' || path === 'solo/solo-records/' ? '{"records":[]}' : '{}';
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Length': Buffer.byteLength(body),
        });
        res.end(body);
        return;
      }
    }

    const dynamicEloAsset = isDynamicEloAssetPath(path);

    const supportedEncodings = this.supportedEncodings(req);
    const toFile: {file?: string, encoding?: Encoding } = this.toFile(path, supportedEncodings);

    if (toFile.file === undefined) {
      throw RouteError.notFound();
    }

    const file = toFile.file;

    if (file === 'assets/index.html') {
      await this.serveIndexHtml(res);
      return;
    }

    // asset caching
    const buffer = (this.cacheAssets && !dynamicEloAsset) ? this.cache.get(file) : undefined;
    if (buffer !== undefined) {
      if (req.headers['if-none-match'] === buffer.hash) {
        responses.notModified(res);
        return;
      }
      res.setHeader('ETag', buffer.hash);
    }

    if (dynamicEloAsset) {
      res.setHeader('Cache-Control', 'no-store');
    } else if (this.shouldRevalidateScriptAsset(path)) {
      // Chunk names are stable across releases, so stale client-side script caching can
      // otherwise mix an old UI with a newer server contract.
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (buffer !== undefined) {
      res.setHeader('Cache-Control', 'must-revalidate');
    } else if (this.cacheAssets === false) {
      res.setHeader('Cache-Control', 'max-age=' + this.cacheAgeSeconds);
    }

    const contentType = ContentType.getContentType(file);
    if (contentType !== undefined) {
      res.setHeader('Content-Type', contentType);
    }

    if (toFile.encoding !== undefined) {
      res.setHeader('Content-Encoding', toFile.encoding);
    }

    if (buffer !== undefined) {
      res.setHeader('Content-Length', buffer.buffer.length);
      res.end(buffer.buffer);
      return;
    }

    try {
      const data = await this.fileApi.readFile(file);
      res.setHeader('Content-Length', data.length);
      res.end(data);
      if (this.cacheAssets === true && !dynamicEloAsset) {
        this.cache.set(file, data);
      }
    } catch (err) {
      const error = err as ErrnoLikeError;
      if (error.code === 'ENOENT') {
        responses.notFound(req, res);
        return;
      }
      console.log(err);
      throw RouteError.internalServerError('Cannot serve ' + path);
    }
  }

  private async serveIndexHtml(res: Response): Promise<void> {
    const template = (await this.fileApi.readFile('assets/index.html')).toString('utf8');
    const manifest = this.assetManifest;
    const html = manifest !== undefined ?
      this.withAssetManifest(template, manifest) :
      this.withAssetVersion(template, await this.getAssetVersion());
    const data = Buffer.from(html);
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Length', data.length);
    res.end(data);
  }

  private async getAssetVersion(): Promise<string> {
    if (this.assetVersion !== undefined) {
      return this.assetVersion;
    }

    try {
      const releaseJson = JSON.parse((await this.fileApi.readFile('assets/release.json')).toString('utf8'));
      this.assetVersion = this.sanitizeAssetVersion(
        releaseJson.artifactSha256 ?? releaseJson.gitSha ?? releaseJson.packagedAtUtc ?? 'dev');
    } catch (_err) {
      this.assetVersion = 'dev';
    }
    return this.assetVersion;
  }

  private sanitizeAssetVersion(value: unknown): string {
    const version = String(value).replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64);
    return version === '' ? 'dev' : version;
  }

  private withAssetVersion(html: string, version: string): string {
    const suffix = `?v=${version}`;
    return html
      .replace(/styles\.css(?:\?v=[^"]*)?/g, `styles.css${suffix}`)
      .replace(/vendors\.js(?:\?v=[^"]*)?/g, `vendors.js${suffix}`)
      .replace(/main\.js(?:\?v=[^"]*)?/g, `main.js${suffix}`);
  }

  private readAssetManifestSync(): AssetManifest | undefined {
    try {
      const parsed: unknown = JSON.parse(this.fileApi.readFileSync(ASSET_MANIFEST_PATH).toString('utf8'));
      if (parsed === null || typeof parsed !== 'object') {
        return undefined;
      }
      const manifest: AssetManifest = {};
      for (const logicalName of MANIFEST_ASSET_NAMES) {
        const value = (parsed as Record<string, unknown>)[logicalName];
        if (typeof value === 'string' && value !== '' && !value.startsWith('/') && !value.includes('..')) {
          manifest[logicalName] = value;
        }
      }
      if (manifest['main.js'] === undefined || manifest['styles.css'] === undefined) {
        return undefined;
      }
      return manifest;
    } catch (_err) {
      return undefined;
    }
  }

  private withAssetManifest(html: string, manifest: AssetManifest): string {
    return html
      .replace(/styles\.css(?:\?v=[^"]*)?/g, manifest['styles.css'] ?? 'styles.css')
      .replace(/vendors\.js(?:\?v=[^"]*)?/g, manifest['vendors.js'] ?? 'vendors.js')
      .replace(/main\.js(?:\?v=[^"]*)?/g, manifest['main.js'] ?? 'main.js');
  }

  // Returns the hashed url name when urlPath addresses a content-hashed manifest asset.
  private manifestAssetPath(urlPath: string): string | undefined {
    const manifest = this.assetManifest;
    if (manifest === undefined) {
      return undefined;
    }
    for (const logicalName of MANIFEST_ASSET_NAMES) {
      const hashedName = manifest[logicalName];
      if (hashedName !== undefined && (urlPath === hashedName || urlPath === `${hashedName}.map`)) {
        return hashedName;
      }
    }
    return undefined;
  }

  private toHashedFile(urlPath: string, encodings: Set<Encoding>): { file?: string, encoding?: Encoding } {
    const file = `build/${urlPath}`;
    if (isProduction()) {
      if (encodings.has('br')) {
        return {file: file + '.br', encoding: 'br'};
      }
      if (encodings.has('gzip')) {
        return {file: file + '.gz', encoding: 'gzip'};
      }
    }
    return {file, encoding: undefined};
  }

  private toMainFile(urlPath: string, encodings: Set<Encoding>): { file?: string, encoding?: Encoding } {
    const file = `build/${urlPath}`;

    // Only serve compressed versions in production. Development mode serves
    // uncompressed versions because they can be hot-swapped.
    if (isProduction()) {
      if (encodings.has('br')) {
        return {file: file + '.br', encoding: 'br'};
      } else if (encodings.has('gzip')) {
        return {file: file + '.gz', encoding: 'gzip'};
      }
    }

    // Fallback on uncompressed file if in development or no compressed
    // file exists.
    return {file, encoding: undefined};
  }

  private toServiceWorkerFile(urlPath: string): { file?: string, encoding?: Encoding } {
    return {
      file: `build/${urlPath}`,
    };
  }

  private toFile(urlPath: string, encodings: Set<Encoding>): { file?: string, encoding?: Encoding } {
    const eloAsset = resolveEloAssetPath(urlPath);
    if (eloAsset !== undefined) {
      return {file: eloAsset};
    }

    if (this.manifestAssetPath(urlPath) !== undefined) {
      return this.toHashedFile(urlPath, encodings);
    }

    switch (urlPath) {
    case 'elo/':
    case 'elo/index.html':
      return {file: 'elo/index.html'};

    case 'assets/index.html':
    case 'assets/Prototype.ttf':
    case 'assets/Prototype-ru.ttf':
    case 'assets/Prototype-pl.ttf':
    case 'assets/futureforces.ttf':
      return {file: urlPath};

    case 'styles.css':
      if (encodings.has('br')) {
        return {file: 'build/styles.css.br', encoding: 'br'};
      }
      if (encodings.has('gzip')) {
        return {file: 'build/styles.css.gz', encoding: 'gzip'};
      }
      return {file: 'build/styles.css'};

    case 'release.json':
      return {file: 'assets/release.json'};

    case 'main.js':
    case 'main.js.map':
    case 'vendors.js':
    case 'vendors.js.map':
      return this.toMainFile(urlPath, encodings);

    // sw.js is empty. Although not confirmed, it seems sw.js is necessary
    // for mobile notifications. If confirmed that it is not necessary, this
    // can be removed.
    case 'sw.js':
    case '/sw.js':
      return this.toServiceWorkerFile(urlPath);

    case 'favicon.ico':
      return {file: 'assets/favicon.ico'};

    default:
      // Serve JS chunks produced by webpack code splitting.
      if (urlPath.startsWith('chunks/')) {
        const chunksRoot = path.resolve('./build/chunks');
        const resolvedFile = path.resolve(path.normalize('build/' + urlPath));
        if (resolvedFile.startsWith(chunksRoot)) {
          if (urlPath.endsWith('.js') || urlPath.endsWith('.js.map')) {
            return this.toMainFile(urlPath, encodings);
          }
        }
      }

      if (urlPath.endsWith('.png') || urlPath.endsWith('.jpg') || urlPath.endsWith('.json') || urlPath.endsWith('.svg') ||
          urlPath.endsWith('.avif') || urlPath.endsWith('.webp')) {
        const assetsRoot = path.resolve('./assets');
        const resolvedFile = path.resolve(path.normalize(urlPath));

        // Only allow assets inside of assets directory
        if (resolvedFile.startsWith(assetsRoot)) {
          return {file: resolvedFile};
        }
      }
    }

    return {};
  }

  private shouldRevalidateScriptAsset(urlPath: string): boolean {
    // Content-hashed files never need revalidation: a new build changes the file name.
    if (this.manifestAssetPath(urlPath) !== undefined) {
      return false;
    }
    switch (urlPath) {
    case 'main.js':
    case 'main.js.map':
    case 'vendors.js':
    case 'vendors.js.map':
      return true;
    default:
      return urlPath.startsWith('chunks/') &&
        (urlPath.endsWith('.js') || urlPath.endsWith('.js.map'));
    }
  }

  private supportedEncodings(req: Request): Set<Encoding> {
    const result = new Set<Encoding>();
    for (const header of String(req.headers['accept-encoding']).split(', ')) {
      if (header === 'br' || header === 'gzip') {
        result.add(header);
      }
    }
    return result;
  }
}
