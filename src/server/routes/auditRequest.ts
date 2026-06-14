import {Request} from '../Request';

export function getUserAgent(req: Request): string | undefined {
  const value = req.headers['user-agent'];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
