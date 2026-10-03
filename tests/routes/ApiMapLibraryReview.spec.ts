import {expect} from 'chai';
import {ApiMapLibraryReview} from '../../src/server/routes/ApiMapLibraryReview';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {restoreTestDatabase, setTestDatabase} from '../testing/setup';
import {InMemoryDatabase} from '../testing/InMemoryDatabase';
import {statusCode} from '@/common/http/statusCode';
import {MapLibraryEntry, MapLibraryEntryId} from '@/common/boards/MapLibraryEntry';

function post(scaffolding: RouteTestScaffolding, res: MockResponse, body: unknown): Promise<void> {
  const p = scaffolding.post(ApiMapLibraryReview.INSTANCE, res);
  Promise.resolve().then(() => {
    scaffolding.req.emitString(JSON.stringify(body));
    scaffolding.req.emitter.emit('end');
  });
  return p;
}

function fanmadeEntry(id: MapLibraryEntryId): MapLibraryEntry {
  return {
    id,
    code: 'TMB3fake',
    description: '',
    submittedBy: '',
    origin: 'fanmade',
    status: 'submitted',
    createdAt: 1000,
  };
}

describe('ApiMapLibraryReview', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;
  let db: InMemoryDatabase;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    db = new InMemoryDatabase();
    setTestDatabase(db);
  });

  afterEach(() => {
    restoreTestDatabase();
  });

  it('validates server id', async () => {
    scaffolding.url = '/api/maplibrary/review';
    await post(scaffolding, res, {id: 'm1', action: 'approve'});
    expect(res.statusCode).eq(statusCode.forbidden);
  });

  it('approves a submitted map', async () => {
    await db.insertMapLibraryEntry(fanmadeEntry('m1'));
    scaffolding.url = '/api/maplibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'm1', action: 'approve'});
    expect(res.statusCode).eq(statusCode.ok);
    expect((await db.getMapLibraryEntry('m1'))?.status).eq('approved');
  });

  it('deletes a map', async () => {
    await db.insertMapLibraryEntry(fanmadeEntry('m1'));
    scaffolding.url = '/api/maplibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'm1', action: 'delete'});
    expect(res.statusCode).eq(statusCode.ok);
    expect(await db.getMapLibraryEntry('m1')).is.undefined;
  });

  it('rejects approving an official map', async () => {
    await db.insertMapLibraryEntry({...fanmadeEntry('m1'), origin: 'official', status: 'approved'});
    scaffolding.url = '/api/maplibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'm1', action: 'approve'});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('404s on an unknown id', async () => {
    scaffolding.url = '/api/maplibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'm-nope', action: 'approve'});
    expect(res.statusCode).eq(statusCode.notFound);
  });

  it('400s on an invalid id', async () => {
    scaffolding.url = '/api/maplibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'not-an-id', action: 'approve'});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('400s without a recognized action', async () => {
    await db.insertMapLibraryEntry(fanmadeEntry('m1'));
    scaffolding.url = '/api/maplibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'm1'});
    expect(res.statusCode).eq(statusCode.badRequest);
  });
});
