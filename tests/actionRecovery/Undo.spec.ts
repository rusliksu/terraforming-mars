import {expect} from 'chai';
import crypto from 'crypto';

import {ACTION_SCHEMA_VERSION, ActionErrorResponseV1, ActionUndoSuccessResponseV1} from '../../src/common/actionProtocol/ActionProtocol';
import {InputResponse} from '../../src/common/inputs/InputResponse';
import {GameId, PlayerId, SpectatorId} from '../../src/common/Types';
import {InMemoryActionStore} from '../../src/server/actionStore';
import {ACTION_GATEWAY_ENGINE_VERSION, ActionGateway, EngineFacadeCandidatePort, computePromptToken, stateHashOf} from '../../src/server/actionGateway';
import {ActionRecovery} from '../../src/server/actionRecovery';
import {EnginePromptSnapshot} from '../../src/server/engine/EngineCanonical';
import {getBehaviorExecutor} from '../../src/server/behavior/BehaviorExecutor';
import {globalInitialize} from '../../src/server/globalInitialize';
import {Game} from '../../src/server/Game';
import {EngineFacade, EngineHandle, createDeterministicEngineDependencies} from '../../src/server/engine/worker';
import {IGame} from '../../src/server/IGame';
import {firstInput} from '../actionGateway/InitialCardsTestHelper';
import {Server} from '../../src/server/models/ServerModel';
import {TestPlayer} from '../TestPlayer';
import {CapabilityLessCounterEngine, FakeCounterEngine} from './FakeCounterEngine';

const GAME_ID = 'g-a5b-undo-spec' as GameId;
const SPECTATOR_ID = 'spectator-a5b-undo' as SpectatorId;
const BLUE_USER = 'discord-a5b-undo-blue';
const RED_USER = 'discord-a5b-undo-red';
const SECRET = 'a5b-undo-spec-secret';
const PROMPT: EnginePromptSnapshot = {type: 'or', fingerprint: 'undo-spec-prompt'};
const OPTION_INPUT: InputResponse = {type: 'or', index: 0, response: {type: 'option'}};
const ENGINE_VERSION = ACTION_GATEWAY_ENGINE_VERSION;

type Fixture = {
  game: Game;
  blue: PlayerId;
  red: PlayerId;
  store: InMemoryActionStore;
  engine: FakeCounterEngine | CapabilityLessCounterEngine;
  gateway: ActionGateway;
};

function ensureGlobalInitialized(): void {
  try {
    getBehaviorExecutor();
  } catch (_error) {
    globalInitialize();
  }
}

function newFixture(options: {revealed?: boolean; capabilityless?: boolean} = {}): Fixture {
  const blue = TestPlayer.BLUE.newPlayer({beginner: true});
  blue.user = BLUE_USER;
  const red = TestPlayer.RED.newPlayer({beginner: true});
  red.user = RED_USER;
  const game = Game.newInstance(GAME_ID, [blue, red], blue, SPECTATOR_ID);
  const engineOptions = {
    prompt: PROMPT,
    view: Server.getPlayerModel(blue),
    revealed: options.revealed === true,
  };
  const engine = options.capabilityless === true ?
    new CapabilityLessCounterEngine(engineOptions) :
    new FakeCounterEngine(engineOptions);
  const store = new InMemoryActionStore({now: () => 1_700_000_000_000});
  const gateway = new ActionGateway({
    store,
    engine,
    engineVersion: ENGINE_VERSION,
    promptTokenSecret: SECRET,
  });
  return {game, blue: blue.id, red: red.id, store, engine, gateway};
}

function userOf(fixture: Fixture, actorId: PlayerId): string {
  return actorId === fixture.blue ? BLUE_USER : RED_USER;
}

function games(fixture: Fixture) {
  return {
    getGame: async (id: GameId) => (id === GAME_ID ? fixture.game : undefined),
  };
}

function token(actorId: PlayerId, revision: number): string {
  return computePromptToken(SECRET, {gameId: GAME_ID, actorId, revision, prompt: PROMPT});
}

async function act(fixture: Fixture, actorId: PlayerId, baseRevision: number) {
  const raw = JSON.stringify({
    v: ACTION_SCHEMA_VERSION,
    gameId: GAME_ID,
    actionId: crypto.randomUUID(),
    baseRevision,
    promptToken: token(actorId, baseRevision + 1),
    engineVersion: ENGINE_VERSION,
    input: OPTION_INPUT,
  });
  return fixture.gateway.handle({
    principal: {id: userOf(fixture, actorId)},
    rawBody: raw,
    games: games(fixture),
  });
}

async function undo(
  fixture: Fixture,
  actorId: PlayerId,
  baseRevision: number,
  actionId: string = crypto.randomUUID(),
) {
  const raw = JSON.stringify({
    v: ACTION_SCHEMA_VERSION,
    gameId: GAME_ID,
    actionId,
    baseRevision,
    engineVersion: ENGINE_VERSION,
  });
  return fixture.gateway.handleUndo({
    principal: {id: userOf(fixture, actorId)},
    rawBody: raw,
    games: games(fixture),
  });
}

function recoveryFor(fixture: Fixture): ActionRecovery {
  return new ActionRecovery({
    store: fixture.store,
    engine: new FakeCounterEngine({prompt: PROMPT, view: Server.getPlayerModel(fixture.game.players[0])}),
  });
}

async function twoAcceptedActions(fixture: Fixture): Promise<void> {
  expect((await act(fixture, fixture.blue, 0)).statusCode).eq(200);
  expect((await act(fixture, fixture.red, 1)).statusCode).eq(200);
}

describe('Append-only undo', () => {
  before(() => {
    ensureGlobalInitialized();
  });

  it('appends a new intent and revision, advances the epoch, and keeps old events', async () => {
    const fixture = newFixture();
    await twoAcceptedActions(fixture);

    const before = await recoveryFor(fixture).recover({gameId: GAME_ID, captureRevision: 1});
    if (before.capturedStateHash === undefined) {
      throw new Error('expected the captured state hash of revision 1');
    }
    const hashAfterFirst = before.capturedStateHash;
    expect(before.stateHash).not.eq(hashAfterFirst);

    const result = await undo(fixture, fixture.red, 2);
    expect(result.statusCode).eq(200);
    const body = result.body as ActionUndoSuccessResponseV1;
    expect(body.status).eq('undone');
    expect(body.revision).eq(3);
    expect(body.appliedRevision).eq(3);
    expect(body.undoneRevision).eq(2);
    expect(body.view.id).eq(fixture.red);
    expect(body.promptToken).match(/^[0-9a-f]{64}$/);

    const after = await recoveryFor(fixture).recover({gameId: GAME_ID});
    expect(after.revision).eq(3);
    expect(after.stateHash).eq(hashAfterFirst);
    expect(after.plan.undos).length(1);
    expect(after.plan.actions.length).eq(1);

    // Append-only: every accepted action is still in the journal.
    const intents = await fixture.store.listIntents(GAME_ID);
    expect(intents.length).eq(3);
    expect(intents[0].revision).eq(1);
    expect(intents[1].revision).eq(2);
    expect(intents[2].revision).eq(3);
    expect((await fixture.store.getStream(GAME_ID))?.epoch).eq(2);
  });

  it('can undo the first effective action back to genesis', async () => {
    const fixture = newFixture();
    expect((await act(fixture, fixture.blue, 0)).statusCode).eq(200);
    const genesisHash = stateHashOf(fixture.game.serialize());

    const result = await undo(fixture, fixture.blue, 1);
    expect(result.statusCode).eq(200);
    const body = result.body as ActionUndoSuccessResponseV1;
    expect(body.undoneRevision).eq(1);

    const after = await recoveryFor(fixture).recover({gameId: GAME_ID});
    expect(after.revision).eq(2);
    expect(after.plan.actions.length).eq(0);
    expect(after.plan.undos.length).eq(1);
    expect(after.stateHash).eq(genesisHash);
  });

  it('rejects an undo that would hide revealed information', async () => {
    const fixture = newFixture();
    await twoAcceptedActions(fixture);

    (fixture.engine as FakeCounterEngine).revealed = true;
    const rejectedResult = await undo(fixture, fixture.red, 2);

    expect(rejectedResult.statusCode).eq(422);
    expect((rejectedResult.body as ActionErrorResponseV1).code).eq('UNDO_HIDDEN_INFORMATION');
    expect((await fixture.store.getStream(GAME_ID))?.revision).eq(2);
    expect(await fixture.store.listIntents(GAME_ID)).length(2);

    (fixture.engine as FakeCounterEngine).revealed = false;
    const accepted = await undo(fixture, fixture.red, 2);
    expect(accepted.statusCode).eq(200);
    expect((await fixture.store.getStream(GAME_ID))?.revision).eq(3);
  });

  it('fails closed when the engine cannot prove disclosure', async () => {
    const fixture = newFixture({capabilityless: true});
    await twoAcceptedActions(fixture);

    const result = await undo(fixture, fixture.red, 2);
    expect(result.statusCode).eq(422);
    expect((result.body as ActionErrorResponseV1).code).eq('UNDO_REJECTED');
    expect((await fixture.store.getStream(GAME_ID))?.revision).eq(2);
    expect(await fixture.store.listIntents(GAME_ID)).length(2);
  });

  it('refuses a stale base revision without appending', async () => {
    const fixture = newFixture();
    await twoAcceptedActions(fixture);

    const result = await undo(fixture, fixture.red, 1);
    expect(result.statusCode).eq(409);
    expect((result.body as ActionErrorResponseV1).code).eq('STALE_REVISION');
    expect((result.body as ActionErrorResponseV1).currentRevision).eq(2);
    expect((result.body as ActionErrorResponseV1).resync).eq('full');
    expect(await fixture.store.listIntents(GAME_ID)).length(2);
  });

  it('answers a retried undo idempotently after the head moved', async () => {
    const fixture = newFixture();
    await twoAcceptedActions(fixture);

    const actionId = crypto.randomUUID();
    const first = await undo(fixture, fixture.red, 2, actionId);
    expect(first.statusCode).eq(200);
    const firstBody = first.body as ActionUndoSuccessResponseV1;
    expect(firstBody.revision).eq(3);

    // A crash-retry still carries the pre-undo base revision.
    const second = await undo(fixture, fixture.red, 2, actionId);
    expect(second.statusCode).eq(200);
    const secondBody = second.body as ActionUndoSuccessResponseV1;
    expect(secondBody.status).eq('undone');
    expect(secondBody.appliedRevision).eq(firstBody.appliedRevision);
    expect(secondBody.undoneRevision).eq(2);
    expect(await fixture.store.listIntents(GAME_ID)).length(3);
  });

  it('accepts a new action on the reverted head and replays consistently', async () => {
    const fixture = newFixture();
    await twoAcceptedActions(fixture);

    const undone = await undo(fixture, fixture.red, 2);
    expect(undone.statusCode).eq(200);

    const next = await act(fixture, fixture.blue, 3);
    expect(next.statusCode).eq(200);
    expect((next.body as {revision: number}).revision).eq(4);

    const restarted = new ActionGateway({
      store: fixture.store,
      engine: new FakeCounterEngine({prompt: PROMPT, view: Server.getPlayerModel(fixture.game.players[0])}),
      engineVersion: ENGINE_VERSION,
      promptTokenSecret: SECRET,
    });
    await restarted.initialize();
    const recovered = await new ActionRecovery({
      store: fixture.store,
      engine: new FakeCounterEngine({prompt: PROMPT, view: Server.getPlayerModel(fixture.game.players[0])}),
    }).recover({gameId: GAME_ID});
    expect(recovered.revision).eq(4);
    expect(recovered.plan.undos).length(1);
    expect(recovered.plan.actions.length).eq(2);
  });

  it('uses the real engine disclosure guard for the base+Prelude slice', async () => {
    // Real candidate port: the undo of an initial-cards action must be refused
    // because the player's private cards changed since the target revision.
    const {handle, game, blue, red} = newRealEngineFixture();
    const store = new InMemoryActionStore({now: () => 1_700_000_000_000});
    const gateway = new ActionGateway({
      store,
      engine: new EngineFacadeCandidatePort({now: () => 1_700_000_000_000, idPrefix: 'ga5b-undo'}),
      engineVersion: ENGINE_VERSION,
      promptTokenSecret: SECRET,
    });
    await gateway.initialize();

    const first = await realAct(gateway, game, handle, blue, 0);
    expect(first.statusCode).eq(200);
    const second = await realAct(gateway, game, handle, red, 1);
    expect(second.statusCode).eq(200);

    const raw = JSON.stringify({
      v: ACTION_SCHEMA_VERSION,
      gameId: game.id,
      actionId: crypto.randomUUID(),
      baseRevision: 2,
      engineVersion: ENGINE_VERSION,
    });
    const result = await gateway.handleUndo({
      principal: {id: RED_USER},
      rawBody: raw,
      games: {getGame: async (id: GameId) => (id === game.id ? game : undefined)},
    });

    expect(result.statusCode).eq(422);
    expect((result.body as ActionErrorResponseV1).code).eq('UNDO_HIDDEN_INFORMATION');
    expect(await store.listIntents(game.id)).length(2);
    // The legacy destructive restore was never used: the live game is untouched.
    expect(game.lastSaveId).eq(0);
  });
});

function newRealEngineFixture() {
  const dependencies = createDeterministicEngineDependencies({nowMs: 1_700_000_000_000, idPrefix: 'ga5b-undo'});
  const handle = new EngineFacade(dependencies).create({
    version: 1,
    seed: 7,
    players: [{name: 'Alice', color: 'blue'}, {name: 'Bob', color: 'red'}],
    gameOptions: {preludeExtension: true, corporateEra: false},
  });
  handle.game.players[0].user = BLUE_USER;
  handle.game.players[1].user = RED_USER;
  return {handle, game: handle.game, blue: handle.game.players[0].id, red: handle.game.players[1].id};
}

async function realAct(
  gateway: ActionGateway,
  game: IGame,
  handle: EngineHandle,
  actorId: PlayerId,
  baseRevision: number,
) {
  const prompt = handle.prompt(actorId);
  if (prompt === null) {
    throw new Error('expected an engine prompt');
  }
  const raw = JSON.stringify({
    v: ACTION_SCHEMA_VERSION,
    gameId: game.id,
    actionId: crypto.randomUUID(),
    baseRevision,
    promptToken: computePromptToken(SECRET, {gameId: game.id, actorId, revision: baseRevision + 1, prompt}),
    engineVersion: ENGINE_VERSION,
    input: firstInput(handle, actorId),
  });
  return gateway.handle({
    principal: {id: userOf({game, blue: handle.game.players[0].id, red: handle.game.players[1].id} as Fixture, actorId)},
    rawBody: raw,
    games: {getGame: async (id: GameId) => (id === game.id ? game : undefined)},
  });
}
