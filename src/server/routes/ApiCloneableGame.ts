import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Database} from '../database/Database';
import {GameId, isGameId} from '../../common/Types';
import {Request} from '../Request';
import {Response} from '../Response';
import {SerializedGame} from '../SerializedGame';
import {DEFAULT_PRELUDE_HANDICAP, NewGameConfig} from '../../common/game/NewGameConfig';
import {RouteError} from './RouteError';

export class ApiCloneableGame extends Handler {
  public static readonly INSTANCE = new ApiCloneableGame();
  private constructor() {
    super();
  }

  /**
   * Returns information about the identified game. Specifically, the number of
   * players it is for.
   *
   * This is used by the frontend to ensure that the cloned game will match the
   * player count in the game the frontend wants to create.
   */
  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const gameId = ctx.url.searchParams.get('id');
    if (gameId === null) {
      responses.badRequest(req, res, 'missing id parameter');
      return;
    }
    if (!isGameId(gameId)) {
      responses.badRequest(req, res, 'invalid game id');
      return;
    }
    await ApiCloneableGame.getPlayerCount(gameId, ctx)
      .then(async (playerCount) => {
        if (ctx.url.searchParams.get('setup') !== 'true') {
          responses.writeJson(res, ctx, {gameId, playerCount});
          return;
        }
        const serialized = await ApiCloneableGame.getRematchSource(gameId, ctx);
        responses.writeJson(res, ctx, {
          gameId,
          playerCount: serialized.players.length,
          setup: ApiCloneableGame.toRematchSetup(serialized),
        });
      })
      .catch((err) => {
        console.warn('Could not load cloneable game: ', err);
        throw RouteError.notFound();
      });
  }

  private static async getPlayerCount(gameId: GameId, ctx: Context): Promise<number> {
    try {
      return await Database.getInstance().getPlayerCount(gameId);
    } catch {
      const game = await ctx.gameLoader.getGame(gameId);
      if (game !== undefined) {
        return game.players.length;
      }
      const serialized = await Database.getInstance().getGame(gameId);
      if (serialized?.players === undefined) {
        throw new Error(`Game ${gameId} has no player data`);
      }
      return serialized.players.length;
    }
  }

  private static async getRematchSource(gameId: GameId, ctx: Context): Promise<SerializedGame> {
    try {
      return await Database.getInstance().getGameVersion(gameId, 0);
    } catch {
      const game = await ctx.gameLoader.getGame(gameId);
      if (game !== undefined) {
        return game.serialize();
      }
      return Database.getInstance().getGame(gameId);
    }
  }

  private static toRematchSetup(serialized: SerializedGame): NewGameConfig & {seededGame: false} {
    const options = serialized.gameOptions;
    return {
      players: serialized.players.map((player) => ({
        name: player.name,
        color: player.color,
        beginner: player.beginner,
        handicap: player.handicap,
        preludeHandicap: player.preludeHandicap ?? DEFAULT_PRELUDE_HANDICAP,
        first: false,
        isBot: false,
      })),
      expansions: {...options.expansions},
      board: options.boardSelection ?? options.boardName,
      seed: Math.random(),
      randomFirstPlayer: true,
      clonedGamedId: undefined,
      seededGame: false,
      undoOption: options.undoOption,
      undoStepOption: options.undoStepOption === true,
      showTimers: options.showTimers,
      fastModeOption: options.fastModeOption,
      showOtherPlayersVP: options.showOtherPlayersVP,
      privateHands: options.privateHands !== false,
      aresExtremeVariant: options.aresExtremeVariant,
      politicalAgendasExtension: options.politicalAgendasExtension,
      solarPhaseOption: options.solarPhaseOption,
      removeNegativeGlobalEventsOption: options.removeNegativeGlobalEventsOption,
      modularMA: options.modularMA,
      draftVariant: options.draftVariant,
      initialDraft: options.initialDraftVariant,
      initialDraftOneWay: options.initialDraftOneWay === true,
      preludeDraftVariant: options.preludeDraftVariant,
      ceosDraftVariant: options.ceosDraftVariant,
      startingCorporations: options.startingCorporations,
      shuffleMapOption: options.shuffleMapOption,
      randomMA: options.randomMA,
      includeFanMA: options.includeFanMA,
      soloTR: options.soloTR,
      noEloGame: options.noEloGame === true,
      turnBasedGame: options.turnBasedGame === true,
      botGame: false,
      customCorporationsList: [...options.customCorporationsList],
      customCorporations: [...options.customCorporationsList],
      bannedCards: [...options.bannedCards],
      includedCards: [...options.includedCards],
      customColoniesList: [...options.customColoniesList],
      customColonies: [...options.customColoniesList],
      customPreludes: [...options.customPreludes],
      requiresMoonTrackCompletion: options.requiresMoonTrackCompletion,
      requiresVenusTrackCompletion: options.requiresVenusTrackCompletion,
      moonStandardProjectVariant: options.moonStandardProjectVariant,
      moonStandardProjectVariant1: options.moonStandardProjectVariant1,
      altVenusBoard: options.altVenusBoard,
      escapeVelocity: options.escapeVelocity,
      escapeVelocityMode: options.escapeVelocity !== undefined,
      escapeVelocityThreshold: options.escapeVelocity?.thresholdMinutes,
      escapeVelocityBonusSeconds: options.escapeVelocity?.bonusSectionsPerAction,
      escapeVelocityPeriod: options.escapeVelocity?.penaltyPeriodMinutes,
      escapeVelocityPenalty: options.escapeVelocity?.penaltyVPPerPeriod,
      twoCorpsVariant: options.twoCorpsVariant,
      customCeos: [...options.customCeos],
      startingCeos: options.startingCeos,
      startingPreludes: options.startingPreludes,
    } as NewGameConfig & {seededGame: false};
  }
}
