import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Phase} from '../../common/Phase';
import {IPlayer} from '../IPlayer';
import {WaitingForModel} from '../../common/models/WaitingForModel';
import {IGame} from '../IGame';
import {isPlayerId, isSpectatorId} from '../../common/Types';
import {Request} from '../Request';
import {Response} from '../Response';
import {getUserAgent} from './auditRequest';
import {RouteError} from './RouteError';

export class ApiWaitingFor extends Handler {
  public static readonly INSTANCE = new ApiWaitingFor();
  private constructor() {
    super();
  }

  private playerHasRequiredInput(player: IPlayer): boolean {
    const input = player.getWaitingFor();
    if (input !== undefined) {
      return !input.optional;
    }
    return player.game.phase === Phase.END;
  }

  private playersWithRequiredInputs(game: IGame) {
    return game.playersInGenerationOrder
      .filter((player) => {
        const waitingFor = player.getWaitingFor();
        return waitingFor !== undefined && !waitingFor.optional;
      })
      .map((player) => player.color);
  }

  private getPlayerWaitingForModel(player: IPlayer, game: IGame, gameAge: number, undoCount: number): WaitingForModel {
    const inputs = this.playersWithRequiredInputs(game);
    if (this.playerHasRequiredInput(player)) {
      return {result: 'GO', waitingFor: inputs};
    } else if (game.gameAge > gameAge || game.undoCount > undoCount) {
      return {result: 'REFRESH', waitingFor: inputs};
    }
    return {result: 'WAIT', waitingFor: inputs};
  }

  private getSpectatorWaitingForModel(game: IGame, gameAge: number, undoCount: number): WaitingForModel {
    const inputs = this.playersWithRequiredInputs(game);

    if (game.gameAge > gameAge || game.undoCount > undoCount) {
      return {result: 'REFRESH', waitingFor: inputs};
    }
    return {result: 'WAIT', waitingFor: inputs};
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const id = ctx.urlParams.participantId('id');
    const gameAge = ctx.urlParams.number('gameAge');
    const undoCount = ctx.urlParams.number('undoCount');

    const game = await ctx.gameLoader.getGame(id);
    if (game === undefined) {
      throw RouteError.notFound('cannot find game for that player');
    }

    if (isSpectatorId(id)) {
      if (process.env.TM_ACCESS_AUDIT_WAITING_FOR === '1') {
        ctx.accessAudit.record({
          event: 'waiting_for_spectator',
          method: req.method ?? '',
          path: 'api/waitingfor',
          gameId: game.id,
          participantId: id,
          participantKind: 'spectator',
          clientIp: ctx.clientIp,
          userAgent: getUserAgent(req),
        });
      }
      responses.writeJson(res, ctx, this.getSpectatorWaitingForModel(game, gameAge, undoCount));
      return;
    }

    if (!isPlayerId(id)) {
      throw RouteError.badRequest('id not found');
    }

    let player: IPlayer;
    try {
      player = game.getPlayerById(id);
    } catch (err) {
      // This is basically impossible since getPlayerById ensures that the player is on that game.
      console.warn(`unable to find player ${id}`, err);
      throw RouteError.notFound('player not found');
    }

    if (!this.isUser(player.user, ctx) && !this.hasServerIdAccess(ctx)) {
      responses.notAuthorized(req, res);
      return;
    }
    ctx.ipTracker.addParticipant(id, ctx.ip);
    ctx.accessAudit.record({
      event: 'waiting_for_player',
      method: req.method ?? '',
      path: 'api/waitingfor',
      gameId: game.id,
      participantId: id,
      participantKind: 'player',
      clientIp: ctx.clientIp,
      userAgent: getUserAgent(req),
    });
    responses.writeJson(res, ctx, this.getPlayerWaitingForModel(player, game, gameAge, undoCount));
  }
}
