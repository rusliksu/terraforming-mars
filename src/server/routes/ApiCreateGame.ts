import {sendGameStartNotice} from "../TelegramBot";
import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Database} from '../database/Database';
import {BoardName} from '../../common/boards/BoardName';
import {RandomBoardOption} from '../../common/boards/RandomBoardOption';
import {Cloner} from '../database/Cloner';
import {Game} from '../Game';
import {GameOptions} from '../game/GameOptions';
import {Player} from '../Player';
import {Server} from '../models/ServerModel';
import {NewGameConfig} from '../../common/game/NewGameConfig';
import {safeCast, isGameId, isSpectatorId, isPlayerId} from '../../common/Types';
import {generateRandomId} from '../utils/server-ids';
import {IGame} from '../IGame';
import {Request} from '../Request';
import {Response} from '../Response';
import {QuotaConfig, QuotaHandler} from '../server/QuotaHandler';
import {durationToMilliseconds} from '../utils/durations';
import {BotTakeoverManager} from '../bot/BotTakeoverManager';

export function normalizeTelegramId(telegramID: string | undefined): string {
  return (telegramID ?? '').trim();
}

export function isTelegramIdValid(telegramID: string | undefined): boolean {
  const normalized = normalizeTelegramId(telegramID);
  return normalized === '' || /^\d{5,20}$/.test(normalized);
}

type CreateGameRouteDeps = Pick<BotTakeoverManager, 'start' | 'stop'>;

function getQuotaConfig(): QuotaConfig {
  const defaultQuota = {limit: 1, perMs: 1}; // Effectively, no limit.
  const val = process.env.GAME_QUOTA;
  try {
    if (val !== undefined) {
      const struct = JSON.parse(val);
      let {limit} = struct;
      const {per} = struct;
      if (limit === undefined) {
        throw new Error('limit is absent');
      }
      limit = Number.parseInt(limit);
      if (isNaN(limit)) {
        throw new Error('limit is invalid');
      }
      if (per === undefined) {
        throw new Error('per is absent');
      }
      const perMs = durationToMilliseconds(per);
      if (isNaN(perMs)) {
        throw new Error('perMillis is invalid');
      }
      return {limit, perMs};
    }
    return defaultQuota;
  } catch (e) {
    console.warn('While initialzing quota:', (e instanceof Error ? e.message : e));
    return defaultQuota;
  }
}

export class ApiCreateGame extends Handler {
  public static readonly INSTANCE = new ApiCreateGame();
  private quotaHandler;

  public constructor(
    quotaConfig: QuotaConfig = getQuotaConfig(),
    private readonly botManager: CreateGameRouteDeps = BotTakeoverManager.INSTANCE,
  ) {
    super();
    this.quotaHandler = new QuotaHandler(quotaConfig);
  }

  public static boardOptions(board: RandomBoardOption | BoardName): Array<BoardName> {
    const allBoards = Object.values(BoardName);

    if (board === RandomBoardOption.ALL) return allBoards;
    if (board === RandomBoardOption.OFFICIAL) {
      return allBoards.filter((name) => {
        return name === BoardName.THARSIS ||
          name === BoardName.HELLAS ||
          name === BoardName.ELYSIUM;
      });
    }
    return [board];
  }

  // TODO(kberg): much of this code can be moved outside of handler, and that
  // would be better.
  public override post(req: Request, res: Response, ctx: Context): Promise<void> {
    return new Promise((resolve) => {
      if (this.quotaHandler.measure(ctx) === false) {
        responses.quotaExceeded(req, res);
        resolve();
        return;
      }

      let body = '';
      req.on('data', function(data) {
        body += data.toString();
      });
      req.once('end', async () => {
        try {
          const gameReq = JSON.parse(body) as NewGameConfig;
          const invalidTelegramPlayerIndex = gameReq.players.findIndex((player) => !isTelegramIdValid(player.telegramID));
          if (invalidTelegramPlayerIndex !== -1) {
            responses.badRequest(req, res, `invalid telegram id for player ${invalidTelegramPlayerIndex + 1}`);
            resolve();
            return;
          }
          const normalizedTelegramIds = gameReq.players.map((player) => normalizeTelegramId(player.telegramID));
          const gameId = safeCast(generateRandomId('g'), isGameId);
          const spectatorId = safeCast(generateRandomId('s'), isSpectatorId);
          const players = gameReq.players.map((obj: any) => {
            return new Player(
              obj.name,
              obj.color,
              obj.beginner,
              Number(obj.handicap), // For some reason handicap is coming up a string.
              safeCast(generateRandomId('p'), isPlayerId),
            );
          });
          // Assign telegramID from game request
          players.forEach((p, i) => {
            const telegramID = normalizedTelegramIds[i];
            if (telegramID) {
              p.telegramID = telegramID;
            }
          });
          let firstPlayerIdx = 0;
          for (let i = 0; i < gameReq.players.length; i++) {
            if (gameReq.players[i].first === true) {
              firstPlayerIdx = i;
              break;
            }
          }

          const boards = ApiCreateGame.boardOptions(gameReq.board);
          gameReq.board = boards[Math.floor(Math.random() * boards.length)];

          const gameOptions: GameOptions = {
            altVenusBoard: gameReq.altVenusBoard,
            aresExtension: gameReq.expansions.ares,
            aresHazards: true, // Not a runtime option.
            aresExtremeVariant: gameReq.aresExtremeVariant,
            bannedCards: gameReq.bannedCards,
            boardName: gameReq.board,
            ceoExtension: gameReq.expansions.ceo,
            clonedGamedId: gameReq.clonedGamedId,
            coloniesExtension: gameReq.expansions.colonies,
            communityCardsOption: gameReq.expansions.community,
            expansions: gameReq.expansions,
            ceosDraftVariant: gameReq.ceosDraftVariant,
            corporateEra: gameReq.expansions.corpera,
            customCeos: gameReq.customCeos,
            customColoniesList: gameReq.customColoniesList,
            customCorporationsList: gameReq.customCorporationsList,
            customPreludes: gameReq.customPreludes,
            draftVariant: gameReq.draftVariant,
            escapeVelocity: gameReq.escapeVelocity,
            fastModeOption: gameReq.fastModeOption,
            includedCards: gameReq.includedCards,
            includeFanMA: gameReq.includeFanMA,
            initialDraftVariant: gameReq.initialDraft,
            modularMA: gameReq.modularMA,
            moonExpansion: gameReq.expansions.moon,
            moonStandardProjectVariant: gameReq.moonStandardProjectVariant,
            moonStandardProjectVariant1: gameReq.moonStandardProjectVariant1,
            pathfindersExpansion: gameReq.expansions.pathfinders,
            politicalAgendasExtension: gameReq.politicalAgendasExtension,
            prelude2Expansion: gameReq.expansions.prelude2,
            preludeDraftVariant: gameReq.preludeDraftVariant,
            preludeExtension: gameReq.expansions.prelude,
            promoCardsOption: gameReq.expansions.promo,
            randomMA: gameReq.randomMA,
            removeNegativeGlobalEventsOption: gameReq.removeNegativeGlobalEventsOption,
            requiresMoonTrackCompletion: gameReq.requiresMoonTrackCompletion,
            requiresVenusTrackCompletion: gameReq.requiresVenusTrackCompletion,
            showOtherPlayersVP: gameReq.showOtherPlayersVP,
            showTimers: gameReq.showTimers,
            shuffleMapOption: gameReq.shuffleMapOption,
            solarPhaseOption: gameReq.solarPhaseOption,
            soloTR: gameReq.soloTR,
            startingCeos: gameReq.startingCeos,
            startingCorporations: gameReq.startingCorporations,
            startingPreludes: gameReq.startingPreludes,
            starWarsExpansion: gameReq.expansions.starwars,
            turmoilExtension: gameReq.expansions.turmoil,
            twoCorpsVariant: gameReq.twoCorpsVariant,
            underworldExpansion: gameReq.expansions.underworld,
            undoOption: gameReq.undoOption,
            venusNextExtension: gameReq.expansions.venus,
          };

          let game: IGame;
          if (gameOptions.clonedGamedId !== undefined && !gameOptions.clonedGamedId.startsWith('#')) {
            const serialized = await Database.getInstance().getGameVersion(gameOptions.clonedGamedId, 0);
            game = Cloner.clone(gameId, players, firstPlayerIdx, serialized);
          } else {
            const seed = Math.random();
            game = Game.newInstance(gameId, players, players[firstPlayerIdx], gameOptions, seed, spectatorId);
          }

          const botPlayers = players.filter((_player, index) => gameReq.players[index]?.isBot === true);
          const startedBotPlayerIds = new Array<string>();
          try {
            for (const botPlayer of botPlayers) {
              this.botManager.start({
                gameId: game.id,
                playerId: botPlayer.id,
                serverId: ctx.ids.serverId,
              });
              startedBotPlayerIds.push(botPlayer.id);
            }
          } catch (error) {
            for (const playerId of startedBotPlayerIds) {
              this.botManager.stop(safeCast(playerId, isPlayerId));
            }
            responses.badRequest(req, res, error instanceof Error ? error.message : String(error));
            resolve();
            return;
          }

          ctx.gameLoader.add(game);
          // Send Telegram game start notifications
          for (const p of players) {
            if (p.telegramID) {
              sendGameStartNotice(p);
            }
          }
          responses.writeJson(res, ctx, Server.getSimpleGameModel(game, {
            botPlayers: botPlayers.map((player) => player.id),
          }));
        } catch (error) {
          responses.internalServerError(req, res, error);
        }
        resolve();
      });
    });
  }
}
