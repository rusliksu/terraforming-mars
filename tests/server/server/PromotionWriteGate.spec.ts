import {expect} from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {statusCode} from '@/common/http/statusCode';
import {isPromotionWriteBlocked, promotionWriteGatePath} from '@/server/server/PromotionWriteGate';
import {processRequest} from '@/server/server/requestProcessor';
import {MockRequest, MockResponse} from '@tests/routes/HttpMocks';

describe('PromotionWriteGate', () => {
  it('blocks mutating methods only while the gate file exists', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-promotion-gate-'));
    const gateFile = path.join(directory, 'gate');
    try {
      expect(isPromotionWriteBlocked('POST', gateFile)).is.false;
      fs.writeFileSync(gateFile, 'promotion\n');
      expect(isPromotionWriteBlocked('POST', gateFile)).is.true;
      expect(isPromotionWriteBlocked('put', gateFile)).is.true;
      expect(isPromotionWriteBlocked('DELETE', gateFile)).is.true;
      expect(isPromotionWriteBlocked('PATCH', gateFile)).is.true;
      expect(isPromotionWriteBlocked('GET', gateFile)).is.false;
      expect(isPromotionWriteBlocked('HEAD', gateFile)).is.false;
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  });

  it('uses the configured gate path without exposing its contents', () => {
    expect(promotionWriteGatePath({TM_PROMOTION_WRITE_GATE_FILE: './custom-gate'})).eq(path.resolve('./custom-gate'));
  });

  it('returns 503 before routing a mutating request', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-promotion-gate-'));
    const gateFile = path.join(directory, 'gate');
    const originalGateFile = process.env.TM_PROMOTION_WRITE_GATE_FILE;
    try {
      fs.writeFileSync(gateFile, 'promotion\n');
      process.env.TM_PROMOTION_WRITE_GATE_FILE = gateFile;
      const req = new MockRequest();
      const res = new MockResponse();
      req.method = 'POST';
      req.url = '/api/create-game';

      await processRequest(req, res);

      expect(res.statusCode).eq(statusCode.serviceUnavailable);
      expect(res.content).eq('Maintenance in progress');
    } finally {
      if (originalGateFile === undefined) {
        delete process.env.TM_PROMOTION_WRITE_GATE_FILE;
      } else {
        process.env.TM_PROMOTION_WRITE_GATE_FILE = originalGateFile;
      }
      fs.rmSync(directory, {recursive: true, force: true});
    }
  });
});
