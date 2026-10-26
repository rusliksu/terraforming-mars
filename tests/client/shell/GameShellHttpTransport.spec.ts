/* global RequestInit */
import {expect} from 'chai';
import {ACTION_ENDPOINT_PATH, ACTION_SCHEMA_VERSION} from '@/common/actionProtocol/ActionProtocol';
import type {ActionRequestV1, ActionSuccessResponseV1} from '@/common/actionProtocol/ActionProtocol';
import type {InputResponse} from '@/common/inputs/InputResponse';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {GameId, PlayerId} from '@/common/Types';
import {HttpGameShellTransport} from '@/client/shell/GameShellHttpTransport';

const GAME_ID: GameId = 'g-test';
const PLAYER_ID: PlayerId = 'p-player';

type FetchCall = {
  input: string | URL | Request;
  init: RequestInit | undefined;
};

function fakeResponse(body: unknown, statusCode = 200): Response {
  return {
    status: statusCode,
    ok: statusCode >= 200 && statusCode < 300,
    json: async () => body,
  } as Response;
}

function request(): ActionRequestV1 {
  return {
    v: ACTION_SCHEMA_VERSION,
    gameId: GAME_ID,
    actionId: 'action-1',
    baseRevision: 5,
    promptToken: 'prompt-token-0123456789',
    engineVersion: 'engine-1',
    input: {type: 'option'} as InputResponse,
  };
}

describe('HttpGameShellTransport', () => {
  it('POSTs action requests to the frozen v2 endpoint', async () => {
    const calls: Array<FetchCall> = [];
    const body: ActionSuccessResponseV1 = {
      v: ACTION_SCHEMA_VERSION,
      actionId: 'action-1',
      status: 'applied',
      revision: 6,
      appliedRevision: 6,
      engineVersion: 'engine-1',
      viewRevision: 6,
      view: {id: PLAYER_ID, runId: 'view-1', game: {gameId: GAME_ID}} as unknown as PlayerViewModel,
      viewHash: 'view-hash',
    };
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({input, init});
      return fakeResponse(body);
    }) as typeof fetch;

    const transport = new HttpGameShellTransport(fetchImpl);
    const response = await transport.post(request());

    expect(response.statusCode).eq(200);
    expect(response.body?.status).eq('applied');
    expect(calls).length(1);
    expect(calls[0].input).eq(ACTION_ENDPOINT_PATH);
    expect(calls[0].init?.method).eq('POST');
    expect(calls[0].init?.credentials).eq('same-origin');
    const sent = JSON.parse(String(calls[0].init?.body)) as ActionRequestV1;
    expect(sent).deep.eq(request());
  });

  it('resyncs through the authorized GET player endpoint', async () => {
    const calls: Array<FetchCall> = [];
    const view = {id: PLAYER_ID, runId: 'resynced', game: {gameId: GAME_ID}} as unknown as PlayerViewModel;
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({input, init});
      return fakeResponse(view);
    }) as typeof fetch;

    const transport = new HttpGameShellTransport(fetchImpl);
    const resynced = await transport.fetchPlayerView(PLAYER_ID);

    expect(resynced).eq(view);
    expect(calls).length(1);
    expect(String(calls[0].input)).eq('api/player?id=' + PLAYER_ID);
    expect(calls[0].init?.method).eq('GET');
  });
});
