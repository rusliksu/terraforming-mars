import {expect} from 'chai';
import {ApiCustomCardLibrary} from '../../src/server/routes/ApiCustomCardLibrary';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {restoreTestDatabase, setTestDatabase} from '../testing/setup';
import {InMemoryDatabase} from '../testing/InMemoryDatabase';
import {statusCode} from '@/common/http/statusCode';
import {blankCustomCard, MAX_CUSTOM_CARD_DESCRIPTION_LENGTH} from '@/common/cards/CustomCardDefinition';
import {encodeCustomCard} from '@/common/cards/customCardCodec';
import {CustomCardLibraryEntry} from '@/common/cards/CustomCardLibraryEntry';
import {CardName} from '@/common/cards/CardName';

function post(scaffolding: RouteTestScaffolding, handler: ApiCustomCardLibrary, res: MockResponse, body: unknown): Promise<void> {
  const p = scaffolding.post(handler, res);
  Promise.resolve().then(() => {
    scaffolding.req.emitString(JSON.stringify(body));
    scaffolding.req.emitter.emit('end');
  });
  return p;
}

describe('ApiCustomCardLibrary', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;
  // A fresh instance per test, so the QuotaHandler's per-IP state (RouteTestScaffolding always
  // uses the same fixed IP) never accumulates across unrelated tests in this file.
  let handler: ApiCustomCardLibrary;

  function validDefinition() {
    const def = blankCustomCard('Test Card');
    def.behavior = {stock: {steel: 5}};
    return def;
  }

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    handler = new ApiCustomCardLibrary();
    setTestDatabase(new InMemoryDatabase());
  });

  afterEach(() => {
    restoreTestDatabase();
  });

  it('GET lists nothing when empty', async () => {
    await scaffolding.get(handler, res);
    expect(JSON.parse(res.content)).deep.eq([]);
  });

  it('POST submits a valid card (as a definition), which then appears in GET', async () => {
    await post(scaffolding, handler, res, {definition: validDefinition(), submittedBy: 'me'});
    expect(res.statusCode).eq(statusCode.ok);
    const body = JSON.parse(res.content);
    const entry: CustomCardLibraryEntry = body.entry;
    expect(entry.definition.cardName).eq('Test Card');
    expect(entry.submittedBy).eq('me');
    expect(entry.status).eq('submitted');
    expect(entry.id.startsWith('c')).is.true;
    expect(entry.shareCode).eq(encodeCustomCard(entry.definition));

    const listRes = new MockResponse();
    await scaffolding.get(handler, listRes);
    expect(JSON.parse(listRes.content)).deep.eq([entry]);
  });

  it('POST submits a valid card as a pasted share code', async () => {
    const code = encodeCustomCard(validDefinition());
    await post(scaffolding, handler, res, {code});
    expect(res.statusCode).eq(statusCode.ok);
    const entry: CustomCardLibraryEntry = JSON.parse(res.content).entry;
    expect(entry.definition.cardName).eq('Test Card');
  });

  it('POST rejects a garbage code', async () => {
    await post(scaffolding, handler, res, {code: 'not-a-real-code'});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('POST rejects when neither code nor definition is given', async () => {
    await post(scaffolding, handler, res, {submittedBy: 'me'});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('POST rejects a card with neither a behavior nor an effect description', async () => {
    const def = blankCustomCard('No Effect Card');
    await post(scaffolding, handler, res, {definition: def});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('POST accepts a card with only a free-text effect description (no behavior)', async () => {
    const def = blankCustomCard('Described Card');
    def.effectDescription = 'Gain 5 steel somehow.';
    await post(scaffolding, handler, res, {definition: def});
    expect(res.statusCode).eq(statusCode.ok);
  });

  it('POST rejects a behavior outside the curated whitelist (the actual security boundary)', async () => {
    const def = blankCustomCard('Sneaky Card');
    def.behavior = {or: {behaviors: []}};
    await post(scaffolding, handler, res, {definition: def});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('POST rejects renderData outside the curated whitelist (the icon-tree security boundary)', async () => {
    const def = validDefinition();
    def.renderData = {is: 'root', rows: [[{is: 'item', type: 'steel', amount: 1, text: '<img src=x onerror=alert(1)>'}]]} as any;
    await post(scaffolding, handler, res, {definition: def});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('POST rejects an over-length description', async () => {
    const def = validDefinition();
    def.description = 'x'.repeat(MAX_CUSTOM_CARD_DESCRIPTION_LENGTH + 1);
    await post(scaffolding, handler, res, {definition: def});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('POST rejects a name that collides with a real card', async () => {
    const def = validDefinition();
    def.cardName = CardName.MINERAL_DEPOSIT;
    await post(scaffolding, handler, res, {definition: def});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('POST rejects a name that collides with an already-submitted custom card', async () => {
    await post(scaffolding, handler, res, {definition: validDefinition()});
    expect(res.statusCode).eq(statusCode.ok);

    const res2 = new MockResponse();
    await post(scaffolding, handler, res2, {definition: validDefinition()});
    expect(res2.statusCode).eq(statusCode.badRequest);
  });

  it('POST is rate-limited past its quota', async () => {
    const throttled = new ApiCustomCardLibrary([{limit: 1, perMs: 60 * 60 * 1000}]);
    const def1 = blankCustomCard('Throttle Card A');
    def1.behavior = {stock: {steel: 1}};
    await post(scaffolding, throttled, res, {definition: def1});
    expect(res.statusCode).eq(statusCode.ok);

    const res2 = new MockResponse();
    const def2 = blankCustomCard('Throttle Card B');
    def2.behavior = {stock: {steel: 1}};
    await post(scaffolding, throttled, res2, {definition: def2});
    expect(res2.statusCode).eq(statusCode.tooManyRequests);
  });
});
