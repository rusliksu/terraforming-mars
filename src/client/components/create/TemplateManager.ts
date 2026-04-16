import {CreateGameModel} from './CreateGameModel';

const TEMPLATES_KEY = 'tm_game_templates';
const LAST_SETTINGS_KEY = 'tm_last_settings';

export interface GameTemplate {
  name: string;
  settings: Record<string, unknown>;
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
    if (!localStorageAvailable()) return [];
    try {
      const data = localStorage.getItem(TEMPLATES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveTemplate(name: string, settings: Record<string, unknown>): void {
    if (!localStorageAvailable()) return;
    const templates = this.getTemplates();
    const idx = templates.findIndex((t) => t.name === name);
    if (idx >= 0) {
      templates[idx].settings = settings;
    } else {
      templates.push({name, settings});
    }
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  }

  static deleteTemplate(name: string): boolean {
    if (!localStorageAvailable()) return false;
    const templates = this.getTemplates();
    const filtered = templates.filter((t) => t.name !== name);
    if (filtered.length === templates.length) return false;
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
    return true;
  }

  static getTemplate(name: string): GameTemplate | undefined {
    return this.getTemplates().find((t) => t.name === name);
  }

  static renameTemplate(oldName: string, newName: string): boolean {
    if (!localStorageAvailable()) return false;
    const templates = this.getTemplates();
    const tmpl = templates.find((t) => t.name === oldName);
    if (!tmpl) return false;
    if (templates.some((t) => t.name === newName)) return false;
    tmpl.name = newName;
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  }

  static saveLastSettings(settings: Record<string, unknown>): void {
    if (!localStorageAvailable()) return;
    try {
      localStorage.setItem(LAST_SETTINGS_KEY, JSON.stringify(settings));
    } catch { /* quota exceeded, ignore */ }
  }

  static getLastSettings(): Record<string, unknown> | undefined {
    if (!localStorageAvailable()) return undefined;
    try {
      const data = localStorage.getItem(LAST_SETTINGS_KEY);
      return data ? JSON.parse(data) : undefined;
    } catch {
      return undefined;
    }
  }

  /** Serialize current form state for storage (compatible with JSONProcessor.applyJSON) */
  static serializeFormState(model: CreateGameModel): Record<string, unknown> {
    const state: Record<string, unknown> = {};

    state.players = model.players.slice(0, model.playersCount).map((p) => ({...p}));
    state.expansions = {...model.expansions};

    const simpleFields: Array<keyof CreateGameModel> = [
      'draftVariant', 'showOtherPlayersVP', 'board', 'solarPhaseOption',
      'aresExtremeVariant', 'politicalAgendasExtension', 'undoOption', 'showTimers',
      'fastModeOption', 'removeNegativeGlobalEventsOption', 'includeFanMA', 'modularMA',
      'startingCorporations', 'soloTR', 'initialDraft', 'preludeDraftVariant',
      'ceosDraftVariant', 'randomMA', 'shuffleMapOption', 'randomFirstPlayer',
      'requiresVenusTrackCompletion', 'requiresMoonTrackCompletion',
      'moonStandardProjectVariant', 'moonStandardProjectVariant1', 'altVenusBoard',
      'escapeVelocityMode', 'escapeVelocityBonusSeconds', 'escapeVelocityPenalty',
      'escapeVelocityPeriod', 'escapeVelocityThreshold',
      'twoCorpsVariant', 'startingCeos', 'startingPreludes',
    ];

    for (const f of simpleFields) {
      state[f] = model[f];
    }

    // Deep copy arrays
    state.customCorporations = [...model.customCorporations];
    state.customColonies = [...model.customColonies];
    state.customPreludes = [...model.customPreludes];
    state.bannedCards = [...model.bannedCards];
    state.includedCards = [...model.includedCards];
    state.customCeos = [...model.customCeos];

    return state;
  }
}
