import * as fs from 'fs';
import * as path from 'path';
import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {ApiCreateGame} from './ApiCreateGame';
import {Game} from '../Game';
import {Player} from '../Player';
import {GameOptions} from '../game/GameOptions';
import {NewGameConfig, NewPlayerModel} from '../../common/game/NewGameConfig';
import {PLAYER_COLORS, Color} from '../../common/Color';
import {safeCast, isGameId, isSpectatorId, isPlayerId} from '../../common/Types';
import {generateRandomId} from '../utils/server-ids';
import {Request} from '../Request';
import {Response} from '../Response';
import {RandomBoardOption} from '../../common/boards/RandomBoardOption';
import {BoardName} from '../../common/boards/BoardName';
import {RandomMAOptionType} from '../../common/ma/RandomMAOptionType';
import {Expansion, DEFAULT_EXPANSIONS} from '../../common/cards/GameModule';

interface TemplateEntry {
  name: string;
  settings: Record<string, any>;
}

/** Maps old-style template expansion fields to Expansion keys */
const OLD_EXPANSION_FIELDS: Record<string, Expansion> = {
  corporateEra: 'corpera',
  promoCardsOption: 'promo',
  venusNext: 'venus',
  colonies: 'colonies',
  prelude: 'prelude',
  prelude2Expansion: 'prelude2',
  preludeTwoExtension: 'prelude2',
  turmoil: 'turmoil',
  communityCardsOption: 'community',
  aresExtension: 'ares',
  moonExpansion: 'moon',
  pathfindersExpansion: 'pathfinders',
  leadersExpansion: 'ceo',
  ceoExtension: 'ceo',
  starWarsExpansion: 'starwars',
  underworldExpansion: 'underworld',
};

export class ApiQuickGame extends Handler {
  public static readonly INSTANCE = new ApiQuickGame();

  private templates: Array<TemplateEntry> | undefined;

  private loadTemplates(): Array<TemplateEntry> {
    if (this.templates === undefined) {
      const filePath = path.join(__dirname, '..', '..', '..', '..', 'assets', 'default_templates.json');
      const raw = fs.readFileSync(filePath, 'utf-8');
      this.templates = JSON.parse(raw) as Array<TemplateEntry>;
    }
    return this.templates;
  }

  private buildExpansions(settings: Record<string, any>): Record<Expansion, boolean> {
    if (settings.expansions && typeof settings.expansions === 'object') {
      return {...DEFAULT_EXPANSIONS, ...settings.expansions};
    }
    const expansions: Record<Expansion, boolean> = {...DEFAULT_EXPANSIONS};
    for (const [oldField, expansion] of Object.entries(OLD_EXPANSION_FIELDS)) {
      if (typeof settings[oldField] === 'boolean') {
        expansions[expansion] = settings[oldField];
      }
    }
    return expansions;
  }

  private generatePlayers(count: number): Array<NewPlayerModel> {
    const players: Array<NewPlayerModel> = [];
    for (let i = 0; i < count; i++) {
      players.push({
        name: 'Player ' + (i + 1),
        color: PLAYER_COLORS[i % PLAYER_COLORS.length] as Color,
        beginner: false,
        handicap: 0,
        first: i === 0,
      });
    }
    return players;
  }

  private settingsToConfig(settings: Record<string, any>, playerCount: number): NewGameConfig {
    const expansions = this.buildExpansions(settings);
    const players = this.generatePlayers(playerCount);

    let board: BoardName | RandomBoardOption = RandomBoardOption.ALL;
    if (settings.board) {
      const b = settings.board as string;
      if (b === 'random all') board = RandomBoardOption.ALL;
      else if (b === 'random official') board = RandomBoardOption.OFFICIAL;
      else board = b as BoardName;
    }

    let randomMA: RandomMAOptionType = RandomMAOptionType.NONE;
    if (settings.randomMA) {
      const ma = settings.randomMA as string;
      if (ma === 'Limited synergy' || ma === RandomMAOptionType.LIMITED) {
        randomMA = RandomMAOptionType.LIMITED;
      } else if (ma === 'Full random' || ma === RandomMAOptionType.UNLIMITED) {
        randomMA = RandomMAOptionType.UNLIMITED;
      } else if (ma === 'Synergy') {
        randomMA = RandomMAOptionType.LIMITED;
      }
    }

    let escapeVelocity = undefined;
    if (settings.escapeVelocityMode === true) {
      escapeVelocity = {
        thresholdMinutes: settings.escapeVelocityThreshold ?? 30,
        bonusSectionsPerAction: settings.escapeVelocityBonusSeconds ?? 2,
        penaltyPeriodMinutes: settings.escapeVelocityPeriod ?? 2,
        penaltyVPPerPeriod: settings.escapeVelocityPenalty ?? 1,
      };
    }

    const bannedCards = settings.bannedCards ?? settings.cardsBlackList ?? [];
    const includedCards = settings.includedCards ?? [];
    const customCorporationsList = settings.customCorporationsList ?? settings.customCorporations ?? [];
    const customColoniesList = settings.customColoniesList ?? settings.customColonies ?? [];
    const customPreludes = settings.customPreludes ?? [];
    const customCeos = settings.customCeos ?? [];

    return {
      players,
      expansions,
      board,
      seed: Math.random(),
      randomFirstPlayer: settings.randomFirstPlayer ?? true,
      clonedGamedId: undefined,
      undoOption: settings.undoOption ?? true,
      showTimers: settings.showTimers ?? true,
      fastModeOption: settings.fastModeOption ?? true,
      showOtherPlayersVP: settings.showOtherPlayersVP ?? true,
      aresExtremeVariant: settings.aresExtremeVariant ?? false,
      politicalAgendasExtension: settings.politicalAgendasExtension ?? 'Standard',
      solarPhaseOption: settings.solarPhaseOption ?? false,
      removeNegativeGlobalEventsOption: settings.removeNegativeGlobalEventsOption ?? false,
      modularMA: settings.modularMA ?? false,
      draftVariant: settings.draftVariant ?? true,
      initialDraft: settings.initialDraft ?? false,
      preludeDraftVariant: settings.preludeDraftVariant ?? false,
      ceosDraftVariant: settings.ceosDraftVariant ?? false,
      startingCorporations: settings.startingCorporations ?? 2,
      shuffleMapOption: settings.shuffleMapOption ?? false,
      randomMA: randomMA,
      includeFanMA: settings.includeFanMA ?? false,
      soloTR: settings.soloTR ?? false,
      customCorporationsList,
      bannedCards,
      includedCards,
      customColoniesList,
      customPreludes,
      requiresMoonTrackCompletion: settings.requiresMoonTrackCompletion ?? false,
      requiresVenusTrackCompletion: settings.requiresVenusTrackCompletion ?? false,
      moonStandardProjectVariant: settings.moonStandardProjectVariant ?? false,
      moonStandardProjectVariant1: settings.moonStandardProjectVariant1 ?? false,
      altVenusBoard: settings.altVenusBoard ?? false,
      escapeVelocity,
      twoCorpsVariant: settings.twoCorpsVariant ?? false,
      customCeos,
      startingCeos: settings.startingCeos ?? 3,
      startingPreludes: settings.startingPreludes ?? 4,
    };
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const templateName = ctx.url.searchParams.get('template');
    if (!templateName) {
      const templates = this.loadTemplates();
      const names = templates.map((t) => t.name);
      responses.writeJson(res, ctx, {templates: names});
      return;
    }

    const playerCountParam = ctx.url.searchParams.get('players');
    const playerCount = playerCountParam ? parseInt(playerCountParam, 10) : 3;
    if (isNaN(playerCount) || playerCount < 1 || playerCount > 6) {
      responses.badRequest(req, res, 'players must be between 1 and 6');
      return;
    }

    const templates = this.loadTemplates();
    const template = templates.find((t) => t.name === templateName);
    if (!template) {
      const available = templates.map((t) => t.name).join(', ');
      responses.notFound(req, res, 'Template not found: ' + templateName + '. Available: ' + available);
      return;
    }

    try {
      const gameReq = this.settingsToConfig(template.settings, playerCount);
      const gameId = safeCast(generateRandomId('g'), isGameId);
      const spectatorId = safeCast(generateRandomId('s'), isSpectatorId);
      const players = gameReq.players.map((obj) => {
        return new Player(
          obj.name,
          obj.color,
          obj.beginner,
          Number(obj.handicap),
          safeCast(generateRandomId('p'), isPlayerId),
        );
      });

      const firstPlayerIdx = gameReq.randomFirstPlayer
        ? Math.floor(Math.random() * players.length)
        : 0;

      const boards = ApiCreateGame.boardOptions(gameReq.board);
      gameReq.board = boards[Math.floor(Math.random() * boards.length)];

      const gameOptions: GameOptions = {
        altVenusBoard: gameReq.altVenusBoard,
        aresExtension: gameReq.expansions.ares,
        aresHazards: true,
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

      const seed = Math.random();
      const game = Game.newInstance(gameId, players, players[firstPlayerIdx], gameOptions, seed, spectatorId);
      ctx.gameLoader.add(game);

      const host = req.headers.host || 'localhost:8081';
      const proto = req.headers['x-forwarded-proto'] || 'http';
      const baseUrl = proto + '://' + host;
      const result = {
        id: game.id,
        spectatorUrl: baseUrl + '/spectator?id=' + spectatorId,
        players: game.playersInGenerationOrder.map((p) => ({
          name: p.name,
          color: p.color,
          id: p.id,
          url: baseUrl + '/player?id=' + p.id,
        })),
        template: templateName,
        playerCount: playerCount,
      };

      responses.writeJson(res, ctx, result);
    } catch (error) {
      responses.internalServerError(req, res, error);
    }
  }
}
