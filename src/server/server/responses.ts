import {escape} from 'html-escaper';
import {Context} from '../routes/IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {statusCode} from '../../common/http/statusCode';
import {isProduction} from '../utils/server';

export function badRequest(req: Request, res: Response, err?: string): void {
  console.warn('bad request', req.url);
  res.writeHead(statusCode.badRequest);
  res.write('Bad request');
  if (err) {
    res.write(': ');
    res.write(err);
  }
  res.end();
}

export function notFound(req: Request, res: Response, err?: string): void {
  if (!process.argv.includes('hide-not-found-warnings')) {
    console.warn('Not found', req.method, req.url);
  }
  res.writeHead(statusCode.notFound);
  res.write('Not found');
  if (err) {
    res.write(': ');
    res.write(err);
  }
  res.end();
}

export function appendCookie(res: Response, cookie: string) {
  const existing = res.getHeader?.('Set-Cookie');
  if (existing === undefined) {
    res.setHeader('Set-Cookie', cookie);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookie]);
  } else {
    res.setHeader('Set-Cookie', [String(existing), cookie]);
  }
}

export function setCookie(res: Response, key: string, value: string, lifetimeSeconds: number) {
  appendCookie(res, `${key}=${value}; HttpOnly; Secure; SameSite=Strict; Max-Age=${lifetimeSeconds}; Path=/`);
}

export function clearCookie(res: Response, key: string) {
  appendCookie(res, `${key}=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}

export function redirect(res: Response, destination: string) {
  res.writeHead(statusCode.found, {'Location': destination});
  res.end();
}

export function notModified(res: Response): void {
  res.writeHead(statusCode.notModified);
  res.end();
}

export function internalServerError(
  req: Request,
  res: Response,
  err: unknown): void {
  console.warn('internal server error: ', req.url, err);
  res.writeHead(statusCode.internalServerError);
  res.write(internalServerErrorMessage(err));
  res.end();
}

function internalServerErrorMessage(err: unknown): string {
  if (isProduction() && process.env.EXPOSE_INTERNAL_ERRORS !== '1') {
    return 'Internal server error';
  }
  if (err instanceof Error) {
    return 'Internal server error: ' + escape(err.message);
  }
  if (typeof(err) === 'string') {
    return 'Internal server error: ' + escape(err);
  }
  return 'Internal server error: unknown error';
}

export function notAuthorized(req: Request, res: Response): void {
  console.warn('Not authorized', req.method, req.url);
  res.writeHead(statusCode.forbidden);
  res.write('Not authorized');
  res.end();
}

export function unprocessableEntity(req: Request, res: Response, msg: string = 'Unprocessable Entity'): void {
  console.warn(msg, req.method, req.url);
  res.writeHead(statusCode.unprocessableEntity);
  res.write(msg);
  res.end();
}

export function downgradeRedirect(_req: Request, res: Response, ctx: Context): void {
  const url = new URL(ctx.url); // defensive copty
  url.searchParams.set('serverId', ctx.ids.statsId);
  res.writeHead(statusCode.movedPermanently, {Location: url.pathname + url.search});
  res.end();
}

export function writeJson(res: Response, ctx: Context, json: any, space?: string | number | undefined) {
  res.setHeader('Content-Type', 'application/json');
  if (ctx.user) {
    json._user = {userid: ctx.user.global_name};
  }
  const s = JSON.stringify(json, undefined, space);
  res.setHeader('Content-Length', Buffer.byteLength(s));
  res.end(s);
}

export function quotaExceeded(req: Request, res: Response) {
  console.warn('Quota exceeded for', req.method, req.url);
  res.writeHead(statusCode.tooManyRequests);
  res.write('Quota exceeded');
  res.end();
}
