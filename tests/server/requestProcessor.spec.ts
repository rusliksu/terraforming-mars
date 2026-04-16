import {expect} from 'chai';

import {GameLoader} from '../../src/server/database/GameLoader';
import {ServeAsset} from '../../src/server/routes/ServeAsset';
import {processRequest} from '../../src/server/server/requestProcessor';
import {MockRequest, MockResponse} from '../routes/HttpMocks';

describe('requestProcessor', () => {
  function withServeAssetSpy(cb: (calls: Array<string>) => void): void {
    const calls: Array<string> = [];
    const original = ServeAsset.INSTANCE.processRequest.bind(ServeAsset.INSTANCE);
    const originalGameLoader = GameLoader.getInstance;
    (ServeAsset.INSTANCE as unknown as {processRequest: typeof original}).processRequest = (req, res, ctx) => {
      calls.push(String(req.url));
      return Promise.resolve();
    };
    (GameLoader as unknown as {getInstance: typeof originalGameLoader}).getInstance = () => ({}) as never;
    try {
      cb(calls);
    } finally {
      (ServeAsset.INSTANCE as unknown as {processRequest: typeof original}).processRequest = original;
      (GameLoader as unknown as {getInstance: typeof originalGameLoader}).getInstance = originalGameLoader;
    }
  }

  it('routes /elo/ to ServeAsset', () => {
    withServeAssetSpy((calls) => {
      const req = new MockRequest();
      req.url = '/elo/';
      req.headers.host = 'boo.com';
      const res = new MockResponse();

      processRequest(req as any, res as any);

      expect(calls).deep.eq(['/elo/']);
    });
  });

  it('routes /elo/data.json to ServeAsset', () => {
    withServeAssetSpy((calls) => {
      const req = new MockRequest();
      req.url = '/elo/data.json';
      req.headers.host = 'boo.com';
      const res = new MockResponse();

      processRequest(req as any, res as any);

      expect(calls).deep.eq(['/elo/data.json']);
    });
  });
});
