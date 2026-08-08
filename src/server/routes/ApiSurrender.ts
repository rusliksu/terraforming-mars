import * as responses from '../server/responses';
import {isPlayerId} from '../../common/Types';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {BotTakeoverManager} from '../bot/BotTakeoverManager';
import {Phase} from '../../common/Phase';
import {IPlayer} from '../IPlayer';
import {IGame} from '../IGame';
import {AccessAuditEvent} from '../server/AccessAudit';
import {getUserAgent} from './auditRequest';

type SurrenderRouteDeps = Pick<BotTakeoverManager, 'stop'>;

function recordSurrenderAudit(
  req: Request,
  ctx: Context,
  game: IGame,
  player: IPlayer,
  event: AccessAuditEvent,
  authorization: 'admin' | 'player' | 'denied',
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
    metadata: {authorization},
  });
}

function advanceSurrenderedPlayer(game: IGame, player: IPlayer): void {
  if (game.phase === Phase.ACTION && game.activePlayer.id === player.id) {
    player.clearWaitingFor();
    if (!game.hasPassedThisActionPhase(player)) {
      player.pass();
    }
    game.playerIsFinishedTakingActions();
    return;
  }
  if (game.phase === Phase.RESEARCH && !game.hasResearched(player)) {
    player.clearWaitingFor();
    game.playerIsFinishedWithResearchPhase(player);
    return;
  }
  if (game.phase === Phase.PRODUCTION && game.gameIsOver() && game.activePlayer.id === player.id) {
    player.clearWaitingFor();
    game.playerIsDoneWithGame(player);
  }
}

export class ApiSurrender extends Handler {
  public static readonly INSTANCE = new ApiSurrender();

  constructor(private readonly manager: SurrenderRouteDeps = BotTakeoverManager.INSTANCE) {
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
    if (game.phase === Phase.END) {
      responses.badRequest(req, res, 'cannot surrender a finished game');
      return;
    }
    if (game.players.length <= 1) {
      responses.badRequest(req, res, 'cannot surrender a solo game');
      return;
    }
    if (game.phase !== Phase.ACTION) {
      responses.badRequest(req, res, 'can only surrender during the action phase');
      return;
    }
    let player: IPlayer;
    try {
      player = game.getPlayerById(playerId);
    } catch (_err) {
      responses.notFound(req, res, 'player not found');
      return;
    }

    if (game.activePlayer.id !== player.id) {
      responses.badRequest(req, res, 'only the active player can surrender');
      return;
    }

    if (game.botPlayerIds.has(playerId)) {
      recordSurrenderAudit(req, ctx, game, player, 'surrender_rejected', 'denied');
      responses.badRequest(req, res, 'automated players cannot surrender');
      return;
    }
    if (game.surrenderedPlayerIds.has(playerId)) {
      recordSurrenderAudit(req, ctx, game, player, 'surrender_rejected', 'denied');
      responses.badRequest(req, res, 'player already surrendered');
      return;
    }

    game.surrenderedPlayerIds.add(playerId);
    this.manager.stop(playerId);
    advanceSurrenderedPlayer(game, player);
    await ctx.gameLoader.saveGame(game);
    recordSurrenderAudit(
      req,
      ctx,
      game,
      player,
      'surrender_accepted',
      this.hasServerIdAccess(ctx) ? 'admin' : 'player',
    );
    responses.writeJson(res, ctx, {
      surrenderedPlayers: Array.from(game.surrenderedPlayerIds),
    });
  }
}
