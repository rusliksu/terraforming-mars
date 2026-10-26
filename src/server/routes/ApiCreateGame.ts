import {getAutomationCompatibility, automationUnavailableReason} from '../bot/AutomationCompatibility';
import {sendGameStartNotice} from '../TelegramBot';
import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Database} from '../database/Database';
import {BoardName} from '../../common/boards/BoardName';
import {boardOptions} from '../../common/boards/randomBoardOptions';
import {RandomBoardOption} from '../../common/boards/RandomBoardOption';
import {decodeCustomBoard} from '../../common/boards/customBoardCodec';
import {decodeSimpleBoard} from '../../common/boards/simpleBoardCodec';
import {Cloner} from '../database/Cloner';
import {Game} from '../Game';
import {GameOptions} from '../game/GameOptions';
import {aiUnsupportedReasons} from '../../common/ai/aiSupport';
import {aiPlayerName, isAiLevel} from '../../common/ai/AiLevel';
import {Player} from '../Player';
import {Server} from '../models/ServerModel';
import {NewGameConfig, NewPlayerModel, normalizePreludeHandicap} from '../../common/game/NewGameConfig';
import {normalizeEscapeVelocityOptions} from '../../common/game/EscapeVelocityOptions';
import {safeCast, isGameId, isSpectatorId, isPlayerId} from '../../common/Types';
import {generateRandomId} from '../utils/server-ids';
import {IGame} from '../IGame';
import {Request} from '../Request';
import {Response} from '../Response';
import {QuotaConfig, QuotaHandler, getQuotaConfigsFromEnv} from '../server/QuotaHandler';
import {BotTakeoverManager} from '../bot/BotTakeoverManager';
import {DEFAULT_EXPANSIONS} from '../../common/cards/GameModule';
import {readBody} from './readBody';
import {RouteError} from './RouteError';
import {CEO_CARDS_DEALT_PER_PLAYER} from '../../common/constants';
import {hasNegativeEscapeVelocityOption} from '../../common/game/escapeVelocity';

export function normalizeTelegramId(telegramID: string | undefined): string {
  return (telegramID ?? '').trim();
}

/**
 * Normalizes the legacy single-board 'board' field into 'boards'.
 *
 * API callers and cached clients that predate the multi-board 'boards' array still send a
 * single 'board' value (a concrete BoardName or one of the random options). Without this the
 * create-game handler would read 'boards.length' off undefined and fail with a 500.
 */
export function normalizeLegacyBoardSelection(gameReq: NewGameConfig): void {
  if (Array.isArray(gameReq.boards) && gameReq.boards.length > 0) {
    return;
  }
  const legacy = gameReq.board;
  if (legacy === undefined || legacy === null) {
    gameReq.boards = [BoardName.THARSIS];
    return;
  }
  if (legacy === RandomBoardOption.OFFICIAL || legacy === RandomBoardOption.ALL) {
    gameReq.boards = boardOptions(legacy);
    return;
  }
  if (!Object.values(BoardName).includes(legacy)) {
    throw RouteError.badRequest('Invalid board: ' + String(legacy));
  }
  gameReq.boards = [legacy];
}

export function isTelegramIdValid(telegramID: string | undefined): boolean {
  const normalized = normalizeTelegramId(telegramID);
  return normalized === '' || /^\d{5,20}$/.test(normalized);
}

function isTelegramIdRequired(player: NewGameConfig['players'][number]): boolean {
  // AI seats and bot-takeover seats are driven by the server: no chat id to notify.
  return player.isBot !== true && player.aiLevel === undefined;
}

function maskTelegramIdForLog(telegramID: string): string {
  if (telegramID === '') {
    return 'missing';
  }
  return `len=${telegramID.length} last4=${telegramID.slice(-4)}`;
}

type CreateGameRouteDeps = Pick<BotTakeoverManager, 'start' | 'stop'>;

// GAME_QUOTA accepts either a single {limit, per} object, or a JSON array of
// them for multiple independent tiers (e.g. a burst limit and a daily limit).
// A request must satisfy every configured tier to succeed.
function getQuotaConfigs(): Array<QuotaConfig> {
  return getQuotaConfigsFromEnv('GAME_QUOTA', {limit: 1, perMs: 1}); // Effectively, no limit.
}

export class ApiCreateGame extends Handler {
  public static readonly INSTANCE = new ApiCreateGame();
  private quotaHandlers: Array<QuotaHandler>;

  public constructor(
    quotaConfigs: Array<QuotaConfig> = getQuotaConfigs(),
    private readonly botManager: CreateGameRouteDeps = BotTakeoverManager.INSTANCE,
  ) {
    super();
    this.quotaHandlers = quotaConfigs.map((config) => new QuotaHandler(config));
  }

  /**
   * Validates that each custom list can deal every player their starting cards.
   *
   * Throws a bad request `RouteError` naming the minimum size when a list is too small. Matches the checks in
   * CreateGameForm.
   */
  public validateCustomLists(gameReq: NewGameConfig): void {
    const playerCount = gameReq.players.length;

    function validate(list: ReadonlyArray<unknown> | undefined, perPlayerCount: number, type: string): void {
      if (list === undefined) {
        return;
      }
      const required = playerCount * perPlayerCount;
      if (list.length > 0 && list.length < required) {
        throw RouteError.badRequest(`Must select at least ${required} ${type}`);
      }
    }
    validate(gameReq.customCorporationsList, gameReq.startingCorporations, 'corporations');
    validate(gameReq.customPreludes, gameReq.startingPreludes, 'preludes');
    validate(gameReq.customCeos, Math.max(gameReq.startingCeos ?? 0, CEO_CARDS_DEALT_PER_PLAYER), 'CEOs');
  }

  /**
   * Human seats are owned by Discord accounts. AI and bot seats never receive a user.
   * IDs are Discord snowflakes: positive decimal integers.
   */
  public validateDiscordIds(players: ReadonlyArray<NewPlayerModel>, requireAll: boolean): void {
    const seen = new Set<string>();
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (player.isBot === true || isAiLevel(player.aiLevel)) {
        continue;
      }
      const discordId = player.discordId?.trim();
      if (discordId === undefined || discordId === '') {
        if (requireAll) {
          throw RouteError.badRequest(`missing Discord ID for player ${i + 1}`);
        }
        continue;
      }
      if (!/^[1-9][0-9]*$/.test(discordId)) {
        throw RouteError.badRequest(`invalid Discord ID for player ${i + 1}`);
      }
      if (seen.has(discordId)) {
        throw RouteError.badRequest(`duplicate Discord ID for player ${i + 1}`);
      }
      seen.add(discordId);
    }
  }

  // TODO(kberg): much of this code can be moved outside of handler, and that
  // would be better.
  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    const withinQuota = this.quotaHandlers.map((handler) => handler.measure(ctx)).every((ok) => ok);
    if (!withinQuota) {
      responses.quotaExceeded(req, res);
      return;
    }

    const body = await readBody(req);
    try {
      const gameReq = JSON.parse(body) as NewGameConfig;
      gameReq.expansions = {...DEFAULT_EXPANSIONS, ...gameReq.expansions};
      gameReq.expansions.betterMars &&= gameReq.expansions.pathfinders;
      normalizeLegacyBoardSelection(gameReq);
      this.validateCustomLists(gameReq);
      const requiresDiscordLogin = gameReq.requiresDiscordLogin === true;
      if (requiresDiscordLogin && ctx.user === undefined && !this.hasServerIdAccess(ctx)) {
        responses.unauthorized(req, res);
        return;
      }
      this.validateDiscordIds(gameReq.players, requiresDiscordLogin);
      const turnBasedGame = gameReq.turnBasedGame === true;
      const botGame = gameReq.botGame === true;
      if (turnBasedGame) {
        const invalidTelegramPlayerIndex = gameReq.players.findIndex((player) => !isTelegramIdValid(player.telegramID));
        if (invalidTelegramPlayerIndex !== -1) {
          responses.badRequest(req, res, `invalid telegram id for player ${invalidTelegramPlayerIndex + 1}`);
          return;
        }
        const missingTelegramPlayerIndex = gameReq.players.findIndex((player) => {
          return isTelegramIdRequired(player) && normalizeTelegramId(player.telegramID) === '';
        });
        if (missingTelegramPlayerIndex !== -1) {
          responses.badRequest(req, res, `missing telegram id for player ${missingTelegramPlayerIndex + 1}`);
          return;
        }
      }
      const normalizedTelegramIds = turnBasedGame ?
        gameReq.players.map((player) => normalizeTelegramId(player.telegramID)) :
        gameReq.players.map(() => '');
      if (gameReq.escapeVelocity !== undefined && gameReq.escapeVelocity !== null && hasNegativeEscapeVelocityOption(gameReq.escapeVelocity)) {
        throw RouteError.badRequest('Escape Velocity values cannot be negative.');
      }
      const gameId = safeCast(generateRandomId('g'), isGameId);
      const spectatorId = safeCast(generateRandomId('s'), isSpectatorId);
      const requestedPlayers = gameReq.players.map((player) => ({...player, discordId: player.discordId?.trim()}));
      const aiBlockers = aiUnsupportedReasons({
        expansions: gameReq.expansions,
        twoCorpsVariant: gameReq.twoCorpsVariant,
      });
      if (aiBlockers.length > 0 && requestedPlayers.some((p) => isAiLevel(p.aiLevel))) {
        throw RouteError.badRequest(`AI players do not support: ${aiBlockers.join(', ')}.`);
      }
      const players = requestedPlayers.map((p) => {
        const aiLevel = isAiLevel(p.aiLevel) ? p.aiLevel : undefined;
        const player = new Player(
          aiLevel === undefined ? p.name : aiPlayerName(p.name, aiLevel),
          p.color,
          p.beginner,
          Number(p.handicap), // For some reason handicap is coming up a string.
          safeCast(generateRandomId('p'), isPlayerId),
          normalizePreludeHandicap(p.preludeHandicap),
        );
        player.aiLevel = aiLevel;
        if (aiLevel === undefined && p.isBot !== true && p.discordId !== undefined) {
          player.user = p.discordId;
        }
        return player;
      });
      // Assign telegramID from game request
      players.forEach((p, i) => {
        const telegramID = normalizedTelegramIds[i];
        if (telegramID) {
          p.telegramID = telegramID;
        }
      });
      if (turnBasedGame) {
        console.log(
          `Async Telegram game create game=${gameId} ` +
              `recipients=${players.filter((player) => player.telegramID !== '').length}/${players.length} ` +
              `players=${players.map((player) => `${player.id}:${maskTelegramIdForLog(player.telegramID)}`).join(',')}`,
        );
      }
      let firstPlayerIdx = 0;
      for (let i = 0; i < requestedPlayers.length; i++) {
        if (requestedPlayers[i].first === true) {
          firstPlayerIdx = i;
          break;
        }
      }

      const boardName = gameReq.boards[Math.floor(Math.random() * gameReq.boards.length)];

      let customBoard: GameOptions['customBoard'] = undefined;
      if (boardName === BoardName.CUSTOM) {
        if (gameReq.customBoardCode === undefined) {
          throw new Error('A custom board was selected but no map code was provided.');
        }
        customBoard = decodeCustomBoard(gameReq.customBoardCode);
      }

      // Unlike Mars's customBoard, these aren't a board *selection* -- Moon/Venus Phase 2 are
      // always-on secondary boards bundled with their expansion, so a code here is just an
      // optional override of that board's own hard-coded default layout, silently ignored (not
      // decoded at all) if the matching expansion isn't even on.
      let customMoonBoard: GameOptions['customMoonBoard'] = undefined;
      if (gameReq.expansions.moon && gameReq.customMoonBoardCode !== undefined) {
        customMoonBoard = decodeSimpleBoard(gameReq.customMoonBoardCode);
        if (customMoonBoard.boardType !== 'moon') {
          throw new Error(`That code is for ${customMoonBoard.boardType}, not the Moon.`);
        }
      }
      let customVenusSurfaceBoard: GameOptions['customVenusSurfaceBoard'] = undefined;
      if (gameReq.expansions.venusPhase2 && gameReq.customVenusSurfaceBoardCode !== undefined) {
        customVenusSurfaceBoard = decodeSimpleBoard(gameReq.customVenusSurfaceBoardCode);
        if (customVenusSurfaceBoard.boardType !== 'venusPhase2') {
          throw new Error(`That code is for ${customVenusSurfaceBoard.boardType}, not Venus Phase 2.`);
        }
      }

      const gameOptions: GameOptions = {
        altVenusBoard: gameReq.altVenusBoard,
        customBoard,
        customMoonBoard,
        customVenusSurfaceBoard,
        globalParameters: customBoard?.globalParameters,
        aresExtension: gameReq.expansions.ares,
        aresHazards: true, // Not a runtime option.
        aresExtremeVariant: gameReq.aresExtremeVariant,
        bannedCards: gameReq.bannedCards,
        boardName: boardName,
        boardSelection: gameReq.boards,
        ceoExtension: gameReq.expansions.ceo,
        clonedGamedId: gameReq.clonedGamedId ?? undefined,
        coloniesExtension: gameReq.expansions.colonies,
        communityCardsOption: gameReq.expansions.community,
        conglomeratesExpansion: gameReq.expansions.conglomerates,
        conglomeratesTeamAssignments: gameReq.expansions.conglomerates ? gameReq.players.map((p) => p.team ?? 0) : undefined,
        expansions: gameReq.expansions,
        ceosDraftVariant: gameReq.ceosDraftVariant,
        corporateEra: gameReq.expansions.corpera,
        customCeos: gameReq.customCeos,
        customColoniesList: gameReq.customColoniesList,
        customCorporationsList: gameReq.customCorporationsList,
        customPreludes: gameReq.customPreludes,
        draftVariant: gameReq.draftVariant,
        escapeVelocity: normalizeEscapeVelocityOptions(gameReq.escapeVelocity),
        fastModeOption: gameReq.fastModeOption,
        includedCards: gameReq.includedCards,
        includeFanMA: gameReq.includeFanMA,
        initialDraftVariant: gameReq.initialDraft,
        initialDraftOneWay: gameReq.initialDraftOneWay === true,
        modularMA: gameReq.modularMA,
        // AI games are training games by default: results against the computer never count for ELO.
        noEloGame: gameReq.noEloGame === true || gameReq.players.some((p) => isAiLevel(p.aiLevel)),
        turnBasedGame,
        moonExpansion: gameReq.expansions.moon,
        moonStandardProjectVariant: gameReq.moonStandardProjectVariant,
        corporateBettermentsExpansion: gameReq.expansions.corporateBetterments,
        idesOfMarsExpansion: gameReq.expansions.idesOfMars,
        industriesExpansion: gameReq.expansions.industries,
        highOrbitExpansion: gameReq.expansions.highOrbit,
        solarisExpansion: gameReq.expansions.solaris,
        robAntillesExpansion: gameReq.expansions.robAntilles,
        morePartiesExpansion: gameReq.expansions.moreParties,
        venusPhase2Expansion: gameReq.expansions.venusPhase2,
        moonStandardProjectVariant1: gameReq.moonStandardProjectVariant1,
        pathfindersExpansion: gameReq.expansions.pathfinders,
        politicalAgendasExtension: gameReq.politicalAgendasExtension,
        privateHands: gameReq.privateHands !== false,
        requiresDiscordLogin,
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
        deltaProjectExpansion: gameReq.expansions.deltaProject,
        sillyficationExpansion: gameReq.expansions.sillyfication,
        betterMarsExpansion: gameReq.expansions.betterMars,
        rebalancedExpansion: gameReq.expansions.rebalanced,
        customCardsExpansion: gameReq.expansions.customCards,
        undoOption: gameReq.undoOption,
        undoStepOption: gameReq.undoStepOption === true,
        aiAnalysis: gameReq.aiAnalysis === true && gameReq.players.some((p) => isAiLevel(p.aiLevel)),
        venusNextExtension: gameReq.expansions.venus,
      };

      const requireBotCompatibility = (options: Partial<GameOptions>, newGame: boolean) => {
        if (!botGame || !requestedPlayers.some((player) => player.isBot)) {
          return;
        }
        const reason = automationUnavailableReason(getAutomationCompatibility(options, newGame));
        if (reason !== undefined) {
          throw RouteError.badRequest(reason);
        }
      };
      let game: IGame;
      if (gameOptions.clonedGamedId !== undefined && !gameOptions.clonedGamedId.startsWith('#')) {
        const serialized = await Database.getInstance().getGameVersion(gameOptions.clonedGamedId, 0);
        requireBotCompatibility(serialized.gameOptions, false);
        game = Cloner.clone(gameId, players, firstPlayerIdx, serialized, ctx.gameLoader.saveGame.bind(ctx.gameLoader));
      } else {
        requireBotCompatibility(gameOptions, true);
        const seed = Number.isFinite(gameReq.seed) && gameReq.seed >= 0 && gameReq.seed < 1 ?
          gameReq.seed : Math.random();
        game = Game.newInstance(gameId, players, players[firstPlayerIdx], spectatorId, gameOptions, seed, ctx.gameLoader.saveGame.bind(ctx.gameLoader));
      }

      const botPlayers = botGame ? players.filter((_player, index) => requestedPlayers[index]?.isBot === true) : [];
      game.setBotPlayerIds(botPlayers.map((player) => player.id));
      const startedBotPlayerIds = new Array<string>();
      try {
        for (const botPlayer of botPlayers) {
          this.botManager.start({
            compatibility: getAutomationCompatibility(game.gameOptions),
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
        return;
      }

      await ctx.gameLoader.add(game);
      // Send Telegram game start notifications
      if (game.gameOptions.turnBasedGame === true) {
        for (const p of game.players) {
          if (p.telegramID) {
            void sendGameStartNotice({
              name: p.name,
              id: p.id,
              telegramID: p.telegramID,
              lastNoticeMessageId: p.lastNoticeMessageId,
              lastTurnNoticeKey: p.lastTurnNoticeKey,
              game: p.game,
            });
          }
        }
      }
      responses.writeJson(res, ctx, Server.getSimpleGameModel(game, {
        botPlayers: botPlayers.map((player) => player.id),
      }));
    } catch (error) {
      if (error instanceof RouteError) {
        throw error;
      }
      responses.internalServerError(req, res, error);
    }
  }
}
