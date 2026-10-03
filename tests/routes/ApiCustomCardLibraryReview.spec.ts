import {expect} from 'chai';
import {ApiCustomCardLibraryReview} from '../../src/server/routes/ApiCustomCardLibraryReview';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {restoreTestDatabase, setTestDatabase} from '../testing/setup';
import {InMemoryDatabase} from '../testing/InMemoryDatabase';
import {statusCode} from '@/common/http/statusCode';
import {blankCustomCard} from '@/common/cards/CustomCardDefinition';
import {CustomCardLibraryEntry, CustomCardEntryId} from '@/common/cards/CustomCardLibraryEntry';
import {refreshCustomCardRegistry, isCustomCardName} from '@/server/cards/CustomCardRegistry';
import {CardName} from '@/common/cards/CardName';

function post(scaffolding: RouteTestScaffolding, res: MockResponse, body: unknown): Promise<void> {
  const p = scaffolding.post(ApiCustomCardLibraryReview.INSTANCE, res);
  Promise.resolve().then(() => {
    scaffolding.req.emitString(JSON.stringify(body));
    scaffolding.req.emitter.emit('end');
  });
  return p;
}

function submittedEntry(id: CustomCardEntryId, cardName = 'A Custom Card'): CustomCardLibraryEntry {
  return {
    id,
    definition: blankCustomCard(cardName),
    shareCode: 'TMC1fake',
    submittedBy: '',
    status: 'submitted',
    createdAt: 1000,
  };
}

describe('ApiCustomCardLibraryReview', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;
  let db: InMemoryDatabase;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    db = new InMemoryDatabase();
    setTestDatabase(db);
  });

  afterEach(async () => {
    restoreTestDatabase();
    await refreshCustomCardRegistry();
  });

  it('validates server id', async () => {
    scaffolding.url = '/api/customcardlibrary/review';
    await post(scaffolding, res, {id: 'c1', action: 'approve'});
    expect(res.statusCode).eq(statusCode.forbidden);
  });

  it('rejects approving a card with no behavior yet', async () => {
    await db.insertCustomCardLibraryEntry(submittedEntry('c1'));
    scaffolding.url = '/api/customcardlibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'c1', action: 'approve'});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('set-behavior attaches an effect, then approve succeeds and the registry picks it up', async () => {
    await db.insertCustomCardLibraryEntry(submittedEntry('c1', 'Freshly Approved Card'));
    scaffolding.url = '/api/customcardlibrary/review?serverId=1';

    await post(scaffolding, res, {id: 'c1', action: 'set-behavior', behavior: {stock: {steel: 5}}});
    expect(res.statusCode).eq(statusCode.ok);
    const afterSetBehavior = await db.getCustomCardLibraryEntry('c1');
    expect(afterSetBehavior?.definition.behavior).deep.eq({stock: {steel: 5}});
    expect(afterSetBehavior?.status).eq('submitted'); // set-behavior alone does not approve

    const res2 = new MockResponse();
    await post(scaffolding, res2, {id: 'c1', action: 'approve'});
    expect(res2.statusCode).eq(statusCode.ok);
    expect((await db.getCustomCardLibraryEntry('c1'))?.status).eq('approved');
    expect(isCustomCardName('Freshly Approved Card' as CardName)).is.true;
  });

  it('set-behavior accepts effects outside the curated whitelist (admin-trusted)', async () => {
    await db.insertCustomCardLibraryEntry(submittedEntry('c1'));
    scaffolding.url = '/api/customcardlibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'c1', action: 'set-behavior', behavior: {tr: 2}});
    expect(res.statusCode).eq(statusCode.ok);
  });

  it('deletes a card and the registry no longer resolves it', async () => {
    await db.insertCustomCardLibraryEntry({...submittedEntry('c1', 'Doomed Card'), status: 'approved', definition: {...blankCustomCard('Doomed Card'), behavior: {stock: {steel: 1}}}});
    await refreshCustomCardRegistry();
    expect(isCustomCardName('Doomed Card' as CardName)).is.true;

    scaffolding.url = '/api/customcardlibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'c1', action: 'delete'});
    expect(res.statusCode).eq(statusCode.ok);
    expect(await db.getCustomCardLibraryEntry('c1')).is.undefined;
    expect(isCustomCardName('Doomed Card' as CardName)).is.false;
  });

  it('404s on an unknown id', async () => {
    scaffolding.url = '/api/customcardlibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'c-nope', action: 'approve'});
    expect(res.statusCode).eq(statusCode.notFound);
  });

  it('400s on an invalid id', async () => {
    scaffolding.url = '/api/customcardlibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'not-an-id', action: 'approve'});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('400s without a recognized action', async () => {
    await db.insertCustomCardLibraryEntry(submittedEntry('c1'));
    scaffolding.url = '/api/customcardlibrary/review?serverId=1';
    await post(scaffolding, res, {id: 'c1'});
    expect(res.statusCode).eq(statusCode.badRequest);
  });
});
