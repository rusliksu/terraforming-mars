import * as responses from '../server/responses';
import {isGameId, isPlayerId, GameId} from '../../common/Types';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {BotTakeoverManager} from '../bot/BotTakeoverManager';
import {Phase} from '../../common/Phase';

type BotTakeoverRouteDeps = Pick<BotTakeoverManager, 'list' | 'listPlayerIds' | 'start' | 'stop'>;

export class ApiBotTakeover extends Handler {
  public static readonly INSTANCE = new ApiBotTakeover();

  constructor(private readonly manager: BotTakeoverRouteDeps = BotTakeoverManager.INSTANCE) {
    super();
  }

  public override get(req: Request, res: Response, ctx: Context): Promise<void> {
    const gameId = this.parseGameId(req, res, ctx, false);
    if (gameId === null) {
      return Promise.resolve();
    }
    responses.writeJson(res, ctx, {
      botPlayers: this.manager.listPlayerIds(gameId ?? undefined),
      entries: this.manager.list(gameId ?? undefined),
    });
    return Promise.resolve();
  }

  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    const action = ctx.url.searchParams.get('action');
    if (action !== 'start' && action !== 'stop') {
      responses.badRequest(req, res, 'invalid action parameter');
      return;
    }

    const playerId = ctx.url.searchParams.get('playerId');
    if (playerId === null) {
      responses.badRequest(req, res, 'missing playerId parameter');
      return;
    }
    if (!isPlayerId(playerId)) {
      responses.badRequest(req, res, 'invalid playerId parameter');
      return;
    }

    const expectedGameId = this.parseGameId(req, res, ctx, true);
    if (expectedGameId === null) {
      return;
    }

    const game = await ctx.gameLoader.getGame(playerId);
    if (game === undefined) {
      responses.notFound(req, res, 'game not found for player');
      return;
    }
    if (expectedGameId !== undefined && game.id !== expectedGameId) {
      responses.badRequest(req, res, 'playerId does not belong to gameId');
      return;
    }
    if (game.phase === Phase.END) {
      responses.badRequest(req, res, 'cannot run bot in a finished game');
      return;
    }

    try {
      game.getPlayerById(playerId);
    } catch (_err) {
      responses.notFound(req, res, 'player not found');
      return;
    }

    if (action === 'start') {
      try {
        const entry = this.manager.start({
          gameId: game.id,
          playerId,
          serverId: ctx.ids.serverId,
        });
        responses.writeJson(res, ctx, {
          action,
          botPlayers: this.manager.listPlayerIds(game.id),
          entry,
        });
      } catch (err) {
        responses.badRequest(req, res, err instanceof Error ? err.message : String(err));
      }
      return;
    }

    const stopped = this.manager.stop(playerId);
    if (stopped === undefined) {
      responses.notFound(req, res, 'bot takeover is not active for player');
      return;
    }
    responses.writeJson(res, ctx, {
      action,
      botPlayers: this.manager.listPlayerIds(game.id),
      entry: stopped,
    });
  }

  private parseGameId(req: Request, res: Response, ctx: Context, required: boolean): GameId | undefined | null {
    const raw = ctx.url.searchParams.get('gameId');
    if (raw === null || raw === '') {
      if (required) {
        responses.badRequest(req, res, 'missing gameId parameter');
        return null;
      }
      return undefined;
    }
    if (!isGameId(raw)) {
      responses.badRequest(req, res, 'invalid gameId parameter');
      return null;
    }
    return raw;
  }
}
