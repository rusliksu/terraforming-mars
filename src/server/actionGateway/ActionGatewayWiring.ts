import {GameId} from '../../common/Types';
import {SQLiteActionStore} from '../actionStore';
import {ActionGateway} from './ActionGateway';
import {ACTION_GATEWAY_ENGINE_VERSION} from './ActionGatewayVersion';
import {EngineFacadeCandidatePort} from './EngineFacadeCandidatePort';
import {newPromptTokenSecret} from './PromptToken';

export type ActionGatewayBootstrap =
  | {kind: 'disabled'}
  | {kind: 'unavailable'}
  | {kind: 'ready'; gateway: ActionGateway};

let cached: ActionGatewayBootstrap | undefined;

/**
 * Configures the v2 endpoint outside the request (never via query/body/header).
 *
 * Default is disabled: the route answers 404. Enabling requires an explicit
 * candidate engine adapter, a durable journal path, and a non-empty game-id
 * cohort allowlist; any missing piece is reported as unavailable (503) and
 * never falls back to legacy writes.
 */
export function bootstrapActionGatewayFromEnv(): ActionGatewayBootstrap {
  if (process.env.ACTION_GATEWAY_V2 !== '1') {
    return {kind: 'disabled'};
  }
  if (cached !== undefined && cached.kind === 'ready') {
    return cached;
  }
  const created = createFromEnv();
  if (created.kind === 'ready') {
    cached = created;
  }
  return created;
}

function createFromEnv(): ActionGatewayBootstrap {
  if (process.env.ACTION_GATEWAY_ENGINE !== 'engine-facade-candidate') {
    return {kind: 'unavailable'};
  }
  const storePath = process.env.ACTION_STORE_SQLITE_PATH;
  if (storePath === undefined || storePath.length === 0) {
    return {kind: 'unavailable'};
  }
  const allowedGameIds = parseGameIdCohort(process.env.ACTION_GATEWAY_V2_GAMES);
  if (allowedGameIds === undefined) {
    return {kind: 'unavailable'};
  }
  const configuredEngineVersion = process.env.ACTION_ENGINE_VERSION;
  const engineVersion = configuredEngineVersion !== undefined && configuredEngineVersion.length > 0 ?
    configuredEngineVersion :
    ACTION_GATEWAY_ENGINE_VERSION;
  const configuredSecret = process.env.ACTION_PROMPT_TOKEN_SECRET;
  const secret = configuredSecret !== undefined && configuredSecret.length > 0 ?
    configuredSecret :
    newPromptTokenSecret();
  return {
    kind: 'ready',
    gateway: new ActionGateway({
      store: new SQLiteActionStore(storePath),
      engine: new EngineFacadeCandidatePort(),
      engineVersion,
      promptTokenSecret: secret,
      allowedGameIds,
    }),
  };
}

function parseGameIdCohort(value: string | undefined): ReadonlySet<GameId> | undefined {
  if (value === undefined) {
    return undefined;
  }
  const ids = value.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
  if (ids.length === 0) {
    return undefined;
  }
  return new Set(ids as Array<GameId>);
}
