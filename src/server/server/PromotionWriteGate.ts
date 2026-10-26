import fs from 'fs';
import path from 'path';

const DEFAULT_GATE_FILE = 'db/.promotion-write-gate';

export function promotionWriteGatePath(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const configured = env.TM_PROMOTION_WRITE_GATE_FILE?.trim();
  return path.resolve(configured === undefined || configured === '' ? DEFAULT_GATE_FILE : configured);
}

export function isPromotionWriteBlocked(
  method: string | undefined,
  gateFile: string = promotionWriteGatePath(),
): boolean {
  const normalizedMethod = method?.trim().toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(normalizedMethod ?? '')) {
    return false;
  }
  return fs.existsSync(gateFile);
}
