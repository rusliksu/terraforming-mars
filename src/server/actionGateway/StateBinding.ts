import {GameId} from '../../common/Types';
import {canonicalJson, sha256Hex} from '../actionStore/canonical';
import {canonicalEngineState} from '../engine/EngineCanonical';
import {SerializedGame} from '../SerializedGame';

export const GENESIS_ID_DOMAIN = 'tm.action-gateway.genesis.v1';
export const VIEW_HASH_DOMAIN = 'tm.action-gateway.view.v1';

export type GenesisBinding = {
  genesisId: string;
  baseSaveId: number;
  stateHash: string;
};

/**
 * Stable SHA-256 of the rules state.
 *
 * Uses the engine's canonical projection so wall-clock timers, Telegram IDs,
 * logging metadata, and user identity cannot make the genesis hash unstable.
 */
export function stateHashOf(snapshot: SerializedGame): string {
  return sha256Hex(canonicalJson(canonicalEngineState(snapshot)));
}

/** Short stable genesis id derived from game id, save point, and state hash. */
export function bindGenesis(gameId: GameId, baseSaveId: number, snapshot: SerializedGame): GenesisBinding {
  const stateHash = stateHashOf(snapshot);
  const genesisId = 'v2-' + sha256Hex(canonicalJson({
    domain: GENESIS_ID_DOMAIN,
    gameId,
    baseSaveId,
    stateHash,
  })).slice(0, 48);
  return {genesisId, baseSaveId, stateHash};
}

/** Diagnostic hash of the authorized PlayerViewModel only. */
export function viewHashOf(view: unknown): string {
  return sha256Hex(canonicalJson({
    domain: VIEW_HASH_DOMAIN,
    view: JSON.parse(JSON.stringify(view)),
  }));
}
