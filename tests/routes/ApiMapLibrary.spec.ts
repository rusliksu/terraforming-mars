import {expect} from 'chai';
import {ApiMapLibrary} from '../../src/server/routes/ApiMapLibrary';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {restoreTestDatabase, setTestDatabase} from '../testing/setup';
import {InMemoryDatabase} from '../testing/InMemoryDatabase';
import {statusCode} from '@/common/http/statusCode';
import {blankCustomBoard} from '@/common/boards/CustomBoardDefinition';
import {encodeCustomBoard} from '@/common/boards/customBoardCodec';
import {MapLibraryEntry, MAX_MAP_LIBRARY_DESCRIPTION_LENGTH} from '@/common/boards/MapLibraryEntry';

function post(scaffolding: RouteTestScaffolding, handler: ApiMapLibrary, res: MockResponse, body: unknown): Promise<void> {
  const p = scaffolding.post(handler, res);
  Promise.resolve().then(() => {
    scaffolding.req.emitString(JSON.stringify(body));
    scaffolding.req.emitter.emit('end');
  });
  return p;
}

describe('ApiMapLibrary', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;
  const validCode = encodeCustomBoard(blankCustomBoard(9, 'Test Map'));

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    setTestDatabase(new InMemoryDatabase());
  });

  afterEach(() => {
    restoreTestDatabase();
  });

  it('GET lists nothing when empty', async () => {
    await scaffolding.get(ApiMapLibrary.INSTANCE, res);
    expect(JSON.parse(res.content)).deep.eq([]);
  });

  it('POST submits a valid map, which then appears in GET', async () => {
    await post(scaffolding, ApiMapLibrary.INSTANCE, res, {code: validCode, description: 'a map', submittedBy: 'me'});
    expect(res.statusCode).eq(statusCode.ok);
    const body = JSON.parse(res.content);
    const entry: MapLibraryEntry = body.entry;
    expect(entry.code).eq(validCode);
    expect(entry.description).eq('a map');
    expect(entry.submittedBy).eq('me');
    expect(entry.origin).eq('fanmade');
    expect(entry.status).eq('submitted');
    expect(entry.id.startsWith('m')).is.true;

    const listRes = new MockResponse();
    await scaffolding.get(ApiMapLibrary.INSTANCE, listRes);
    expect(JSON.parse(listRes.content)).deep.eq([entry]);
  });

  it('POST rejects a garbage code', async () => {
    await post(scaffolding, ApiMapLibrary.INSTANCE, res, {code: 'not-a-real-code'});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('POST rejects a missing code', async () => {
    await post(scaffolding, ApiMapLibrary.INSTANCE, res, {description: 'no code here'});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('POST rejects an over-length description', async () => {
    await post(scaffolding, ApiMapLibrary.INSTANCE, res, {code: validCode, description: 'x'.repeat(MAX_MAP_LIBRARY_DESCRIPTION_LENGTH + 1)});
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('POST is rate-limited past its quota', async () => {
    const throttled = new ApiMapLibrary([{limit: 1, perMs: 60 * 60 * 1000}]);
    await post(scaffolding, throttled, res, {code: validCode});
    expect(res.statusCode).eq(statusCode.ok);

    const res2 = new MockResponse();
    await post(scaffolding, throttled, res2, {code: validCode});
    expect(res2.statusCode).eq(statusCode.tooManyRequests);
  });
});
