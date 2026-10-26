import {ACTION_ENDPOINT_PATH} from '@/common/actionProtocol/ActionProtocol';
import type {ActionRequestV1, ActionResponseV1, BootstrapResponseV1} from '@/common/actionProtocol/ActionProtocol';
import {paths} from '@/common/app/paths';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {PlayerId} from '@/common/Types';

import type {GameShellTransport, GameShellTransportResponse} from './GameShellSubmitTypes';

async function readJson(response: Response): Promise<ActionResponseV1 | undefined> {
  try {
    return await response.json() as ActionResponseV1;
  } catch {
    return undefined;
  }
}

/**
 * Browser transport for the v2 protocol.
 *
 * POST uses the frozen /player/input/v2 endpoint. The full resync repeats the
 * legacy authorized GET api/player query, preserving serverId and replacing
 * only the id parameter.
 */
export class HttpGameShellTransport implements GameShellTransport {
  private readonly fetchImpl: typeof fetch;

  public constructor(fetchImpl?: typeof fetch) {
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
  }

  public async post(request: ActionRequestV1): Promise<GameShellTransportResponse> {
    const response = await this.fetchImpl(ACTION_ENDPOINT_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return {
      statusCode: response.status,
      body: await readJson(response),
    };
  }

  public async fetchBootstrap(playerId: PlayerId): Promise<BootstrapResponseV1 | undefined> {
    const response = await this.fetchImpl(this.bootstrapUrl(playerId), {
      method: 'GET',
      credentials: 'same-origin',
      headers: {'Accept': 'application/json'},
    });
    if (!response.ok) {
      return undefined;
    }
    return await readJson(response) as unknown as BootstrapResponseV1 | undefined;
  }

  private bootstrapUrl(playerId: PlayerId): string {
    if (typeof window === 'undefined') {
      return paths.PLAYER_BOOTSTRAP_V2 + '?id=' + encodeURIComponent(playerId);
    }
    const params = new URLSearchParams(window.location.search);
    params.delete('noredirect');
    params.set('id', playerId);
    return paths.PLAYER_BOOTSTRAP_V2 + '?' + params.toString();
  }

  public async fetchPlayerView(playerId?: PlayerId): Promise<PlayerViewModel> {
    const response = await this.fetchImpl(this.playerViewUrl(playerId), {
      method: 'GET',
      credentials: 'same-origin',
      headers: {'Accept': 'application/json'},
    });
    if (!response.ok) {
      throw new Error('player resync failed with HTTP ' + response.status);
    }
    return await response.json() as PlayerViewModel;
  }

  private playerViewUrl(playerId?: PlayerId): string {
    if (typeof window === 'undefined') {
      if (playerId === undefined) {
        throw new Error('player resync needs a player id outside a browser');
      }
      return paths.API_PLAYER + '?id=' + encodeURIComponent(playerId);
    }
    const params = new URLSearchParams(window.location.search);
    params.delete('noredirect');
    if (playerId !== undefined) {
      params.set('id', playerId);
    }
    const query = params.toString();
    return query === '' ? paths.API_PLAYER : paths.API_PLAYER + '?' + query;
  }
}
