import * as responses from '../server/responses';
import {isGameId, isPlayerId, GameId} from '../../common/Types';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {Player} from '../Player';
import {resendTurnNotice} from '../TelegramBot';

type TurnNoticeRouteDeps = {
  resend: typeof resendTurnNotice;
};

export class ApiTurnNotice extends Handler {
  public static readonly INSTANCE = new ApiTurnNotice();

  constructor(private readonly deps: TurnNoticeRouteDeps = {resend: resendTurnNotice}) {
    super({validateServerId: true});
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

    const expectedGameId = this.parseGameId(req, res, ctx);
    if (expectedGameId === null) {
      return;
    }

    const game = await ctx.gameLoader.getGame(playerId);
    if (game === undefined) {
      responses.notFound(req, res, 'game not found for player');
      return;
    }
    if (game.id !== expectedGameId) {
      responses.badRequest(req, res, 'playerId does not belong to gameId');
      return;
    }

    let player: Player;
    try {
      player = game.getPlayerById(playerId) as Player;
    } catch (_err) {
      responses.notFound(req, res, 'player not found');
      return;
    }

    if (!player.telegramID) {
      responses.badRequest(req, res, 'player has no telegram id');
      return;
    }
    if (player.getWaitingFor() === undefined) {
      responses.badRequest(req, res, 'player is not waiting for input');
      return;
    }

    const turnNoticeKey = player.getTurnNoticeKey();
    const sent = await this.deps.resend(player, turnNoticeKey);
    if (!sent) {
      responses.badRequest(req, res, 'turn notice was not sent');
      return;
    }

    responses.writeJson(res, ctx, {
      action: 'resend',
      gameId: game.id,
      playerId: player.id,
      turnNoticeKey,
      lastNoticeMessageId: player.lastNoticeMessageId,
    });
  }

  private parseGameId(req: Request, res: Response, ctx: Context): GameId | null {
    const raw = ctx.url.searchParams.get('gameId');
    if (raw === null || raw === '') {
      responses.badRequest(req, res, 'missing gameId parameter');
      return null;
    }
    if (!isGameId(raw)) {
      responses.badRequest(req, res, 'invalid gameId parameter');
      return null;
    }
    return raw;
  }
}
