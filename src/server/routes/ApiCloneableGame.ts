import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Database} from '../database/Database';
import {isGameId} from '../../common/Types';
import {Request} from '../Request';
import {Response} from '../Response';
import {SerializedGame} from '../SerializedGame';
import {NewGameConfig} from '../../common/game/NewGameConfig';

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
    await Database.getInstance().getPlayerCount(gameId)
      .then(async (playerCount) => {
        if (ctx.url.searchParams.get('setup') !== 'true') {
          responses.writeJson(res, ctx, {gameId, playerCount});
          return;
        }
        const serialized = await Database.getInstance().getGameVersion(gameId, 0);
        responses.writeJson(res, ctx, {
          gameId,
          playerCount,
          setup: ApiCloneableGame.toRematchSetup(serialized),
        });
      })
      .catch((err) => {
        console.warn('Could not load cloneable game: ', err);
        responses.notFound(req, res);
      });
  }

  private static toRematchSetup(serialized: SerializedGame): NewGameConfig & {seededGame: false} {
    const options = serialized.gameOptions;
    return {
      players: serialized.players.map((player) => ({
        name: player.name,
        color: player.color,
        beginner: player.beginner,
        handicap: player.handicap,
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
      preludeDraftVariant: options.preludeDraftVariant,
      ceosDraftVariant: options.ceosDraftVariant,
      startingCorporations: options.startingCorporations,
      shuffleMapOption: options.shuffleMapOption,
      randomMA: options.randomMA,
      includeFanMA: options.includeFanMA,
      soloTR: options.soloTR,
      noEloGame: options.noEloGame === true,
      turnBasedGame: false,
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
