import {JSONObject} from '@/common/Types';
import {CreateGameModel} from './CreateGameModel';

const TEMPLATES_KEY = 'tm_game_templates';

export interface GameTemplate {
  name: string;
  settings: JSONObject;
}

export function sanitizeSettingsForStorage(settings: JSONObject): JSONObject {
  const sanitized = JSON.parse(JSON.stringify(settings)) as JSONObject;
  delete sanitized.clonedGamedId;
  delete sanitized.clonedGameId;
  sanitized.turnBasedGame = false;
  sanitized.botGame = false;
  const players = sanitized.players;
  if (Array.isArray(players)) {
    sanitized.players = players.map((player) => {
      if (player !== null && typeof player === 'object' && !Array.isArray(player)) {
        const sanitizedPlayer = {...player};
        delete sanitizedPlayer.telegramID;
        sanitizedPlayer.isBot = false;
        return sanitizedPlayer;
      }
      return player;
    });
  }
  return sanitized;
}

function sanitizeTemplateForStorage(template: GameTemplate): GameTemplate {
  return {
    name: template.name,
    settings: sanitizeSettingsForStorage(template.settings),
  };
}

function localStorageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export class TemplateManager {
  static getTemplates(): Array<GameTemplate> {
    if (!localStorageAvailable()) {
      return [];
    }
    try {
      const data = localStorage.getItem(TEMPLATES_KEY);
      const templates = data ? JSON.parse(data) as Array<GameTemplate> : [];
      const sanitized = templates.map(sanitizeTemplateForStorage);
      if (JSON.stringify(templates) !== JSON.stringify(sanitized)) {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(sanitized));
      }
      return sanitized;
    } catch {
      return [];
    }
  }

  static saveTemplate(name: string, settings: JSONObject): void {
    if (!localStorageAvailable()) {
      return;
    }
    const sanitizedSettings = sanitizeSettingsForStorage(settings);
    const templates = this.getTemplates();
    const idx = templates.findIndex((t) => t.name === name);
    if (idx >= 0) {
      templates[idx].settings = sanitizedSettings;
    } else {
      templates.push({name, settings: sanitizedSettings});
    }
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  }

  static deleteTemplate(name: string): boolean {
    if (!localStorageAvailable()) {
      return false;
    }
    const templates = this.getTemplates();
    const filtered = templates.filter((t) => t.name !== name);
    if (filtered.length === templates.length) {
      return false;
    }
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
    return true;
  }

  static getTemplate(name: string): GameTemplate | undefined {
    return this.getTemplates().find((t) => t.name === name);
  }

  static renameTemplate(oldName: string, newName: string): boolean {
    if (!localStorageAvailable()) {
      return false;
    }
    const templates = this.getTemplates();
    const tmpl = templates.find((t) => t.name === oldName);
    if (!tmpl) {
      return false;
    }
    if (templates.some((t) => t.name === newName)) {
      return false;
    }
    tmpl.name = newName;
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  }

  /** Serialize current form state for storage (compatible with JSONProcessor.applyJSON) */
  static serializeFormState(model: CreateGameModel): JSONObject {
    const state: JSONObject = {};
    const customSelectionModel = model as CreateGameModel & {
      customCorporationExclusions?: Array<string>;
      customPreludesExclusions?: Array<string>;
      customColonyExclusions?: Array<string>;
    };

    state.players = model.players.slice(0, model.playersCount).map((p) => {
      const player = {...p};
      delete player.telegramID;
      player.isBot = false;
      return player;
    });
    state.expansions = {...model.expansions};

    const simpleFields = [
      'draftVariant', 'showOtherPlayersVP', 'board', 'solarPhaseOption',
      'aresExtremeVariant', 'politicalAgendasExtension', 'undoOption', 'undoStepOption', 'showTimers',
      'fastModeOption', 'removeNegativeGlobalEventsOption', 'includeFanMA', 'modularMA',
      'noEloGame', 'privateHands', 'turnBasedGame', 'botGame', 'startingCorporations', 'soloTR', 'initialDraft', 'initialDraftOneWay', 'preludeDraftVariant',
      'ceosDraftVariant', 'randomMA', 'shuffleMapOption', 'randomFirstPlayer',
      'requiresVenusTrackCompletion', 'requiresMoonTrackCompletion',
      'moonStandardProjectVariant', 'moonStandardProjectVariant1', 'altVenusBoard',
      'escapeVelocityMode', 'escapeVelocityBonusSeconds', 'escapeVelocityPenalty',
      'escapeVelocityPeriod', 'escapeVelocityThreshold',
      'twoCorpsVariant', 'startingCeos', 'startingPreludes',
    ] as const satisfies ReadonlyArray<keyof CreateGameModel>;

    for (const f of simpleFields) {
      state[f] = model[f] as JSONObject[typeof f];
    }
    state.turnBasedGame = false;
    state.botGame = false;

    // Deep copy arrays
    state.customCorporations = [...model.customCorporations];
    state.customColonies = [...model.customColonies];
    state.customPreludes = [...model.customPreludes];
    state.customCorporationExclusions = [...(customSelectionModel.customCorporationExclusions ?? [])];
    state.customPreludesExclusions = [...(customSelectionModel.customPreludesExclusions ?? [])];
    state.customColonyExclusions = [...(customSelectionModel.customColonyExclusions ?? [])];
    state.bannedCards = [...model.bannedCards];
    state.includedCards = [...model.includedCards];
    state.customCeos = [...model.customCeos];

    return state;
  }
}
