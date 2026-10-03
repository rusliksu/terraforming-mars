import {AutomationCompatibility} from '../../common/models/AutomationCompatibility';
import {BoardName} from '../../common/boards/BoardName';
import {DEFAULT_GLOBAL_PARAMETERS} from '../../common/GlobalParameterConfig';
import {CardName} from '../../common/cards/CardName';
import {GameOptions} from '../game/GameOptions';
import {ALL_MODULE_MANIFESTS} from '../cards/AllManifests';
import {isCustomCardName} from '../cards/CustomCardRegistry';

export const FANMADE_MODULES = [
  'sillyfication', 'betterMars', 'customCards', 'conglomerates', 'corporateBetterments',
  'idesOfMars', 'robAntilles', 'moreParties', 'venusPhase2', 'industries', 'highOrbit', 'solaris',
] as const;

const EXTENDED_POOLS = {
  pathfinders: [CardName.SISTEMAS_SEEBECK, CardName.IN_SPIRE, CardName.PLANET_PR_II, CardName.MARS_FRONTIER_ALLIANCE],
  deltaProject: [CardName.QUANTUM_RESEARCH, CardName.DELTA_SURGE, CardName.CORPORATE_ESPIONAGE,
    CardName.DELTA_WORKS, CardName.DEVELOPMENT_MANAGER, CardName.DUTCH_MOUNTAINS,
    CardName.DYNAMIC_OCEAN_BARRIER, CardName.LITTLE_DUTCH_BOY, CardName.SOCIAL_HEATING, CardName.STORM_SURGE_BARRIER],
};

/** Uses setup only: never infer public capabilities from a private hand or draft. */
export function getAutomationCompatibility(options: Partial<GameOptions>, newGame = false): AutomationCompatibility {
  const unsupported = new Set<string>();
  for (const module of FANMADE_MODULES) {
    if (options.expansions?.[module] || options[`${module}Expansion`]) {
      unsupported.add(module);
    }
  }
  if (options.boardName === BoardName.CUSTOM || options.customBoard) {
    unsupported.add('customBoard');
  }
  if (options.customMoonBoard) {
    unsupported.add('customMoonBoard');
  }
  if (options.customVenusSurfaceBoard) {
    unsupported.add('customVenusSurfaceBoard');
  }
  if (options.globalParameters && JSON.stringify(options.globalParameters) !== JSON.stringify(DEFAULT_GLOBAL_PARAMETERS)) {
    unsupported.add('customTracks');
  }
  const included = new Set([
    ...options.includedCards ?? [], ...options.customCorporationsList ?? [],
    ...options.customPreludes ?? [], ...options.customCeos ?? [],
  ]);
  for (const module of Object.keys(EXTENDED_POOLS) as Array<keyof typeof EXTENDED_POOLS>) {
    if (EXTENDED_POOLS[module].some((name) => included.has(name)) ||
      ((newGame || options.fanmadeCardPool) && (options.expansions?.[module] || options[`${module}Expansion`]))) {
      unsupported.add(`${module}:fanmadeCards`);
    }
  }
  for (const manifest of ALL_MODULE_MANIFESTS) {
    if (!FANMADE_MODULES.some((module) => module === manifest.module)) {
      continue;
    }
    if ([...included].some((name) => manifest.projectCards[name] || manifest.corporationCards[name] ||
      manifest.preludeCards[name] || manifest.ceoCards[name])) {
      unsupported.add(manifest.module);
    }
  }
  if ([...included].some(isCustomCardName)) {
    unsupported.add('customCards');
  }
  return {version: 1, unsupportedFeatures: [...unsupported].sort()};
}

export function automationUnavailableReason(compatibility: AutomationCompatibility): string | undefined {
  return compatibility.unsupportedFeatures.length === 0 ? undefined :
    `Automatic play is not supported for these features: ${compatibility.unsupportedFeatures.join(', ')}`;
}
