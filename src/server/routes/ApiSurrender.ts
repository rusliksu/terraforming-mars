import * as responses from '../server/responses';
import {isPlayerId} from '../../common/Types';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {BotTakeoverManager} from '../bot/BotTakeoverManager';
import {IPlayer} from '../IPlayer';
import {IGame} from '../IGame';
import {AccessAuditEvent} from '../server/AccessAudit';
import {getUserAgent} from './auditRequest';
import {SurrenderError, surrenderPlayer} from '../surrender/SurrenderService';
import type {SurrenderBotManager} from '../surrender/SurrenderService';

function recordSurrenderAudit(
  req: Request,
  ctx: Context,
  game: IGame,
  player: IPlayer,
  event: AccessAuditEvent,
  authorization: 'admin' | 'player' | 'denied',
  botTakeover?: 'started' | 'already-active',
): void {
  ctx.accessAudit.record({
    event,
    method: req.method ?? '',
    path: 'api/surrender',
    gameId: game.id,
    participantId: player.id,
    participantKind: 'player',
    clientIp: ctx.clientIp,
    userAgent: getUserAgent(req),
    metadata: botTakeover === undefined ? {authorization} : {authorization, botTakeover},
  });
}

export class ApiSurrender extends Handler {
  public static readonly INSTANCE = new ApiSurrender();

  constructor(private readonly manager: SurrenderBotManager = BotTakeoverManager.INSTANCE) {
    super();
  }

  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    const playerId = ctx.url.searchParams.get('playerId');
    if (playerId === null) {
      responses.badRequest(req, res, 'missing playerId parameter');
      return;
    }
    if (!isPlayerId(playerId)) {
      responses.badRequest(req, res, 'invalid playerId parameter');
      return;
    }

    const game = await ctx.gameLoader.getGame(playerId);
    if (game === undefined) {
      responses.notFound(req, res, 'game not found for player');
      return;
    }
    let player: IPlayer;
    try {
      player = game.getPlayerById(playerId);
    } catch (_err) {
      responses.notFound(req, res, 'player not found');
      return;
    }

    let botTakeover: 'started' | 'already-active';
    try {
      const result = await surrenderPlayer({
        game,
        player,
        gameLoader: ctx.gameLoader,
        manager: this.manager,
        serverId: ctx.ids.serverId,
        advance: () => undefined,
      });
      botTakeover = result.botTakeover;
    } catch (error) {
      recordSurrenderAudit(req, ctx, game, player, 'surrender_rejected', 'denied');
      const message = error instanceof SurrenderError ? error.message : 'unable to surrender';
      responses.badRequest(req, res, message);
      return;
    }

    recordSurrenderAudit(
      req,
      ctx,
      game,
      player,
      'surrender_accepted',
      this.hasServerIdAccess(ctx) ? 'admin' : 'player',
      botTakeover,
    );
    responses.writeJson(res, ctx, {
      surrenderedPlayers: Array.from(game.surrenderedPlayerIds),
    });
  }
}
