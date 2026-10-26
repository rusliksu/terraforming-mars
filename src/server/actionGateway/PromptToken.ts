import crypto from 'crypto';
import {GameId, PlayerId} from '../../common/Types';
import {canonicalJson} from '../actionStore/canonical';
import {EnginePromptSnapshot} from '../engine/EngineCanonical';

export const PROMPT_TOKEN_DOMAIN = 'tm.action-gateway.prompt-token.v1';

export type PromptTokenInput = {
  gameId: GameId;
  actorId: PlayerId;
  /** Revision the token authorizes: the journal head plus one. */
  revision: number;
  prompt: EnginePromptSnapshot;
};

/**
 * HMAC token binding one actor prompt to one expected journal revision.
 *
 * The revision makes a token one-shot even when the prompt itself does not
 * change between actions. The token is opaque to clients and is never logged
 * or persisted in clear text.
 */
export function computePromptToken(secret: string, input: PromptTokenInput): string {
  return crypto.createHmac('sha256', secret).update(canonicalJson({
    domain: PROMPT_TOKEN_DOMAIN,
    gameId: input.gameId,
    actorId: input.actorId,
    revision: input.revision,
    promptType: input.prompt.type,
    promptFingerprint: input.prompt.fingerprint,
  })).digest('hex');
}

export function newPromptTokenSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
