import {isIP} from 'net';
import {Request} from '../Request';

export type ClientIpSource =
  'cf-connecting-ip' |
  'true-client-ip' |
  'x-forwarded-for' |
  'socket.remoteAddress' |
  'unknown';

export type ClientIp = {
  address: string;
  source: ClientIpSource;
};

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function normalizeIp(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.startsWith('::ffff:')) {
    const mapped = trimmed.slice('::ffff:'.length);
    return isIP(mapped) === 4 ? mapped : undefined;
  }
  return isIP(trimmed) === 0 ? undefined : trimmed;
}

function firstForwardedFor(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.split(',')[0]?.trim();
}

export function getClientIp(req: Request): ClientIp {
  const cfConnectingIp = normalizeIp(headerValue(req, 'cf-connecting-ip'));
  if (cfConnectingIp !== undefined) {
    return {address: cfConnectingIp, source: 'cf-connecting-ip'};
  }

  const trueClientIp = normalizeIp(headerValue(req, 'true-client-ip'));
  if (trueClientIp !== undefined) {
    return {address: trueClientIp, source: 'true-client-ip'};
  }

  const forwardedFor = normalizeIp(firstForwardedFor(headerValue(req, 'x-forwarded-for')));
  if (forwardedFor !== undefined) {
    return {address: forwardedFor, source: 'x-forwarded-for'};
  }

  const remoteAddress = normalizeIp(req.socket.remoteAddress);
  if (remoteAddress !== undefined) {
    return {address: remoteAddress, source: 'socket.remoteAddress'};
  }

  return {address: '', source: 'unknown'};
}
