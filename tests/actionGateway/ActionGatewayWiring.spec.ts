import {expect} from 'chai';
import * as os from 'os';
import * as path from 'path';

import {ActionGateway, bootstrapActionGatewayFromEnv} from '../../src/server/actionGateway';

describe('ActionGateway wiring', () => {
  const names = [
    'ACTION_GATEWAY_V2',
    'ACTION_GATEWAY_ENGINE',
    'ACTION_STORE_SQLITE_PATH',
    'ACTION_GATEWAY_V2_GAMES',
    'ACTION_ENGINE_VERSION',
    'ACTION_PROMPT_TOKEN_SECRET',
  ] as const;
  const original = new Map<string, string | undefined>();

  before(() => {
    for (const name of names) {
      original.set(name, process.env[name]);
    }
  });

  afterEach(() => {
    for (const name of names) {
      const value = original.get(name);
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it('is disabled by default, unavailable without an adapter, and ready only with explicit configuration', () => {
    for (const name of names) {
      delete process.env[name];
    }

    expect(bootstrapActionGatewayFromEnv().kind).eq('disabled');

    process.env.ACTION_GATEWAY_V2 = '1';
    expect(bootstrapActionGatewayFromEnv().kind).eq('unavailable');

    process.env.ACTION_GATEWAY_ENGINE = 'engine-facade-candidate';
    expect(bootstrapActionGatewayFromEnv().kind).eq('unavailable');

    process.env.ACTION_STORE_SQLITE_PATH = path.join(
      os.tmpdir(),
      'tm-action-gateway-wiring-' + process.pid + '.sqlite',
    );
    expect(bootstrapActionGatewayFromEnv().kind).eq('unavailable');

    process.env.ACTION_GATEWAY_V2_GAMES = 'g-wiring-cohort';
    const ready = bootstrapActionGatewayFromEnv();
    expect(ready.kind).eq('ready');
    if (ready.kind === 'ready') {
      expect(ready.gateway).instanceof(ActionGateway);
    }
  });
});
