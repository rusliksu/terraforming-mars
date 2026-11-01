import {ACTION_SCHEMA_VERSION, ActionErrorCode, ActionErrorResponseV1} from '../../common/actionProtocol/ActionProtocol';
import {ActionGateway, ActionGatewayBootstrap} from '../actionGateway';
import {Request} from '../Request';
import {Response} from '../Response';

export type BodyReadResult =
  | {ok: true; body: string}
  | {ok: false; tooLarge: true};

export type ResolvedActionV2Bootstrap =
  | {kind: 'disabled'}
  | {kind: 'unavailable'}
  | {kind: 'ready'; gateway: ActionGateway};

/** Reads a request body with a hard byte cap, discarding oversize payloads. */
export function readRequestBody(req: Request, limit: number): Promise<BodyReadResult> {
  return new Promise((resolve) => {
    const chunks: Array<Buffer> = [];
    let bytes = 0;
    let tooLarge = false;
    req.on('data', (chunk: Buffer) => {
      if (tooLarge) {
        return;
      }
      bytes += chunk.length;
      if (bytes > limit) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.once('end', () => {
      if (tooLarge) {
        resolve({ok: false, tooLarge: true});
        return;
      }
      resolve({ok: true, body: Buffer.concat(chunks).toString('utf8')});
    });
  });
}

export function rejected(code: ActionErrorCode, retryable?: boolean): ActionErrorResponseV1 {
  const body: ActionErrorResponseV1 = {
    v: ACTION_SCHEMA_VERSION,
    status: 'rejected',
    code,
  };
  if (retryable !== undefined) {
    body.retryable = retryable;
  }
  return body;
}

export function writeActionJson(res: Response, statusCode: number, body: unknown): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(statusCode);
  res.end(JSON.stringify(body));
}

/**
 * Resolves the v2 gateway exactly like the action route does.
 *
 * A throwing bootstrap is reported as unavailable, never as a fallback to the
 * legacy write path.
 */
export function resolveActionV2Bootstrap(
  factory: () => ActionGatewayBootstrap,
): ResolvedActionV2Bootstrap {
  try {
    return factory();
  } catch (_err) {
    return {kind: 'unavailable'};
  }
}
