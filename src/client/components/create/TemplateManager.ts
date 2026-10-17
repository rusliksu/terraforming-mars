import {JSONObject} from '@/common/Types';
import {CreateGameModel} from './CreateGameModel';

type ScalarFieldTypes = {
  [K in keyof CreateGameModel]?: NonNullable<CreateGameModel[K]> extends boolean ? 'boolean' :
    NonNullable<CreateGameModel[K]> extends number ? 'number' : NonNullable<CreateGameModel[K]> extends string ? 'string' : never
};

/** Native preset fields, shared by serialization and public-link validation. */
export const TEMPLATE_SCALAR_FIELD_TYPES = {
  draftVariant: 'boolean',
  showOtherPlayersVP: 'boolean',
  board: 'string',
  solarPhaseOption: 'boolean',
  customBoardCode: 'string',
  customMoonBoardCode: 'string',
  customVenusSurfaceBoardCode: 'string',
  aresExtremeVariant: 'boolean',
  politicalAgendasExtension: 'string',
  undoOption: 'boolean',
  undoStepOption: 'boolean',
  showTimers: 'boolean',
  fastModeOption: 'boolean',
  removeNegativeGlobalEventsOption: 'boolean',
  includeFanMA: 'boolean',
  modularMA: 'boolean',
  noEloGame: 'boolean',
  privateHands: 'boolean',
  turnBasedGame: 'boolean',
  botGame: 'boolean',
  startingCorporations: 'number',
  soloTR: 'boolean',
  initialDraft: 'boolean',
  initialDraftOneWay: 'boolean',
  preludeDraftVariant: 'boolean',
  ceosDraftVariant: 'boolean',
  randomMA: 'string',
  shuffleMapOption: 'boolean',
  randomFirstPlayer: 'boolean',
  requiresVenusTrackCompletion: 'boolean',
  requiresMoonTrackCompletion: 'boolean',
  moonStandardProjectVariant: 'boolean',
  moonStandardProjectVariant1: 'boolean',
  altVenusBoard: 'boolean',
  escapeVelocityMode: 'boolean',
  escapeVelocityBonusSeconds: 'number',
  escapeVelocityPenalty: 'number',
  escapeVelocityPeriod: 'number',
  escapeVelocityThreshold: 'number',
  twoCorpsVariant: 'boolean',
  startingCeos: 'number',
  startingPreludes: 'number',
} as const satisfies ScalarFieldTypes;

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

    const simpleFields = Object.keys(TEMPLATE_SCALAR_FIELD_TYPES) as Array<keyof typeof TEMPLATE_SCALAR_FIELD_TYPES>;

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
