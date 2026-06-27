import {expect} from 'chai';
import {QuotaHandler} from '../../src/server/server/QuotaHandler';
import {Context} from '../../src/server/routes/IHandler';
import {IPTracker} from '../../src/server/server/IPTracker';
import {GameLoader} from '../../src/server/database/GameLoader';
import {FakeClock} from '../common/FakeClock';
import {ISessionManager} from '../../src/server/server/auth/SessionManager';

describe('QuotaHandler', () => {
  let ctx: Context;
  let fakeClock: FakeClock;

  beforeEach(() => {
    fakeClock = new FakeClock;
    ctx = {
      url: new URL('http://boo.com'),
      ip: '123.45.678.90',
      clientIp: {address: '123.45.678.90', source: 'unknown'},
      ipTracker: {} as IPTracker,
      accessAudit: {record: () => {}},
      gameLoader: {} as GameLoader,
      sessionManager: {} as ISessionManager,
      ids: {
        serverId: '1',
        statsId: '2',
      },
      clock: fakeClock,
    };
  });

  it('sanity', () => {
    const quotaHandler = new QuotaHandler({limit: 5, perMs: 120_000});
    expect(quotaHandler.measure(ctx)).is.true;
    fakeClock.millis += 100;
    expect(quotaHandler.measure(ctx)).is.true;
    fakeClock.millis += 100;
    expect(quotaHandler.measure(ctx)).is.true;
    fakeClock.millis += 100;
    expect(quotaHandler.measure(ctx)).is.true;
    fakeClock.millis += 100;
    expect(quotaHandler.measure(ctx)).is.true;
    fakeClock.millis += 100;
    expect(quotaHandler.measure(ctx)).is.false;
    fakeClock.millis += 100;
    expect(quotaHandler.measure(ctx)).is.false;
    fakeClock.millis += 150_000;
    expect(quotaHandler.measure(ctx)).is.true;
  });
});
