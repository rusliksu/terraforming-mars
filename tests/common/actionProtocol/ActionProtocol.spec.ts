import {expect} from 'chai';
import {CardName} from '../../../src/common/cards/CardName';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {GlobalEventName} from '../../../src/common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {POLICY_IDS} from '../../../src/common/turmoil/Types';
import {Payment} from '../../../src/common/inputs/Payment';
import type {ActionParseResult, ActionRequestV1} from '../../../src/common/actionProtocol/ActionProtocol';
import {ACTION_SCHEMA_VERSION} from '../../../src/common/actionProtocol/ActionProtocol';
import {canonicalActionPayload} from '../../../src/common/actionProtocol/canonicalActionPayload';
import {parseActionRequest, parseActionRequestJson} from '../../../src/common/actionProtocol/parseActionRequest';
import {parseInputResponse} from '../../../src/common/actionProtocol/parseInputResponse';

const ACTION_ID = '123e4567-e89b-42d3-a456-426614174000';
const PROMPT_TOKEN = 'prompt_token_1234567890';
const GAME_ID = 'g123456789abc';

function base(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    v: ACTION_SCHEMA_VERSION,
    gameId: GAME_ID,
    actionId: ACTION_ID,
    baseRevision: 7,
    promptToken: PROMPT_TOKEN,
    engineVersion: 'engine-2026-10-26',
    ...overrides,
  };
}

function request(input: unknown, overrides: Record<string, unknown> = {}): unknown {
  return base({input, ...overrides});
}

function units(megacredits = 1): Record<string, number> {
  return {megacredits, steel: 0, titanium: 0, plants: 0, energy: 0, heat: 0};
}

function expectOk(result: ActionParseResult<unknown>): unknown {
  expect(result.ok, result.ok ? '' : result.error.path + ': ' + result.error.reason).eq(true);
  if (!result.ok) {
    throw new Error('unexpected parse failure');
  }
  return result.value;
}

function expectReject(result: ActionParseResult<unknown>, path?: string): void {
  expect(result.ok).eq(false);
  if (!result.ok && path) {
    expect(result.error.path).eq(path);
  }
}

describe('Action protocol v1', () => {
  it('accepts a minimal option intent', () => {
    const parsed = expectOk(parseActionRequest(request({type: 'option'}))) as ActionRequestV1;
    expect(parsed.gameId).eq(GAME_ID);
    expect(parsed.input).deep.eq({type: 'option'});
  });

  it('accepts every supported input variant at full shape', () => {
    const payment = Payment.of({megacredits: 3, steel: 1});
    const inputs = [
      {type: 'or', index: 0, response: {type: 'option'}},
      {type: 'and', responses: [{type: 'option'}, {type: 'amount', amount: 2}]},
      {type: 'initialCards', responses: [{type: 'card', cards: [CardName.ACQUIRED_COMPANY]}]},
      {type: 'card', cards: [CardName.ACQUIRED_COMPANY, CardName.ALGAE]},
      {type: 'projectCard', card: CardName.ACQUIRED_COMPANY, payment},
      {type: 'space', spaceId: '12'},
      {type: 'player', player: 'red'},
      {type: 'party', partyName: PartyName.MARS},
      {type: 'amount', amount: 3},
      {type: 'colony', colonyName: ColonyName.CALLISTO},
      {type: 'delegate', player: 'blue'},
      {type: 'payment', payment},
      {type: 'productionToLose', units: units()},
      {type: 'aresGlobalParameters', response: {lowOceanDelta: -1, highOceanDelta: 0, temperatureDelta: 1, oxygenDelta: 0}},
      {type: 'globalEvent', globalEventName: GlobalEventName.GLOBAL_DUST_STORM},
      {type: 'policy', policyId: POLICY_IDS[0]},
      {type: 'resource', resource: 'heat'},
      {type: 'resources', units: units(5)},
      {type: 'claimedUndergroundToken', selected: [0, 2]},
      {type: 'deltaProject', amount: 1},
    ];
    for (const input of inputs) {
      expectOk(parseActionRequest(request(input)));
    }
  });

  it('rejects extra envelope fields, including client playerId', () => {
    expectReject(parseActionRequest(base({input: {type: 'option'}, playerId: 'p1'})), '$.playerId');
    expectReject(parseActionRequest(base({input: {type: 'option'}, runId: 'r1'})), '$.runId');
  });

  it('rejects malformed envelope values', () => {
    expectReject(parseActionRequest(request({type: 'option'}, {v: 2})), '$.v');
    expectReject(parseActionRequest(request({type: 'option'}, {gameId: 'p123'})), '$.gameId');
    expectReject(parseActionRequest(request({type: 'option'}, {actionId: 'not-a-uuid'})), '$.actionId');
    expectReject(parseActionRequest(request({type: 'option'}, {baseRevision: -1})), '$.baseRevision');
    expectReject(parseActionRequest(request({type: 'option'}, {promptToken: 'short'})), '$.promptToken');
    expectReject(parseActionRequest(request({type: 'option'}, {engineVersion: 'bad/version'})), '$.engineVersion');
  });

  it('rejects unknown input types and missing fields', () => {
    expectReject(parseActionRequest(request({type: 'nope'})), '$.input.type');
    expectReject(parseActionRequest(request({type: 'card'})), '$.input.cards');
    expectReject(parseActionRequest(request({type: 'option', extra: true})), '$.input.extra');
  });

  it('rejects malformed payment and units', () => {
    const payment = Payment.of({megacredits: 3});
    expectReject(parseActionRequest(request({type: 'payment', payment: {...payment, megacredits: -1}})));
    expectReject(parseActionRequest(request({type: 'payment', payment: {...payment, extra: 1}})));
    expectReject(parseActionRequest(request({type: 'payment', payment: {megacredits: 1}})));
    expectReject(parseActionRequest(request({type: 'resources', units: {...units(), heat: 1.5}})));
    expectReject(parseActionRequest(request({type: 'productionToLose', units: {...units(), heat: -1}})));
  });

  it('rejects duplicate cards and selections', () => {
    expectReject(parseActionRequest(request({type: 'card', cards: [CardName.ALGAE, CardName.ALGAE]})), '$.input.cards[1]');
    expectReject(parseActionRequest(request({type: 'claimedUndergroundToken', selected: [1, 1]})), '$.input.selected[1]');
  });

  it('rejects invalid enum values', () => {
    expectReject(parseActionRequest(request({type: 'card', cards: ['Not a card']})));
    expectReject(parseActionRequest(request({type: 'space', spaceId: '123'})));
    expectReject(parseActionRequest(request({type: 'player', player: 'purple-ish'})));
    expectReject(parseActionRequest(request({type: 'party', partyName: 'Nobody'})));
    expectReject(parseActionRequest(request({type: 'policy', policyId: 'm999'})));
    expectReject(parseActionRequest(request({type: 'resource', resource: 'not-a-resource'})));
  });

  it('rejects deep and oversized nested inputs', () => {
    let nested: unknown = {type: 'option'};
    for (let i = 0; i < 10; i++) {
      nested = {type: 'or', index: 0, response: nested};
    }
    expectReject(parseActionRequest(request(nested)));
    expectReject(parseActionRequest(request({type: 'and', responses: new Array(65).fill({type: 'option'})})));
  });

  it('does not accept a JSON body above the byte limit', () => {
    const raw = JSON.stringify(request({type: 'option'})) + ' '.repeat(33 * 1024);
    expectReject(parseActionRequestJson(raw), '$');
  });

  it('accepts valid JSON through the byte-limited entrypoint', () => {
    const parsed = expectOk(parseActionRequestJson(JSON.stringify(request({type: 'option'})))) as ActionRequestV1;
    expect(parsed.input).deep.eq({type: 'option'});
  });

  it('reports invalid JSON separately from schema errors', () => {
    const malformed = parseActionRequestJson('{');
    expect(malformed.ok).eq(false);
    if (!malformed.ok) {
      expect(malformed.error.code).eq('INVALID_JSON');
    }
  });

  it('canonicalizes key order and changes with semantic payload', () => {
    const first = expectOk(parseActionRequest(request({type: 'option'}))) as ActionRequestV1;
    const reordered = expectOk(parseActionRequest({
      engineVersion: 'engine-2026-10-26',
      input: {type: 'option'},
      promptToken: PROMPT_TOKEN,
      baseRevision: 7,
      actionId: ACTION_ID,
      gameId: GAME_ID,
      v: 1,
    })) as ActionRequestV1;
    expect(canonicalActionPayload(first)).eq(canonicalActionPayload(reordered));
    const changed = expectOk(parseActionRequest(request({type: 'amount', amount: 2}))) as ActionRequestV1;
    expect(canonicalActionPayload(first)).not.eq(canonicalActionPayload(changed));
  });

  it('does not mutate accepted inputs', () => {
    const input = {type: 'amount', amount: 2};
    const original = JSON.stringify(input);
    expectOk(parseInputResponse(input));
    expect(JSON.stringify(input)).eq(original);
  });
});
