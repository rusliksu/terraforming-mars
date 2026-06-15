import * as crypto from 'crypto';
import {Request} from '../Request';
import {Response} from '../Response';
import * as responses from './responses';

export const ACCESS_AUDIT_CLIENT_COOKIE = 'tm_access_audit_client';
const CLIENT_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;

function firstHeaderValue(value: string | Array<string> | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (cookieHeader === undefined) {
    return undefined;
  }
  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) {
      return rawValue.join('=');
    }
  }
  return undefined;
}

function newClientId(): string {
  return crypto.randomBytes(18).toString('base64url');
}

function setClientIdCookie(res: Response, clientId: string) {
  responses.appendCookie(
    res,
    `${ACCESS_AUDIT_CLIENT_COOKIE}=${clientId}; HttpOnly; Secure; SameSite=Lax; Max-Age=${CLIENT_ID_MAX_AGE_SECONDS}; Path=/`,
  );
}

export function getOrSetAccessAuditClientId(req: Request, res: Response): string {
  const existing = cookieValue(firstHeaderValue(req.headers.cookie), ACCESS_AUDIT_CLIENT_COOKIE);
  if (existing !== undefined && CLIENT_ID_PATTERN.test(existing)) {
    return existing;
  }

  const clientId = newClientId();
  setClientIdCookie(res, clientId);
  return clientId;
}
