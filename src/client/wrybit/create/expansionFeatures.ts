import type {GameModule} from '@/common/cards/GameModule';
import type {ClientCard} from '@/common/cards/ClientCard';
import {TileType, tileTypeToString} from '@/common/TileType';

export const TRAIT_KEYS = ['ownBoard', 'newParameters', 'changesMars', 'newTiles'] as const;
export type TraitKey = typeof TRAIT_KEYS[number];
export type ExpansionFeatures = {
  traits: ReadonlySet<TraitKey>;
  tileTypes: ReadonlyArray<TileType>;
  layout: 'ownBoard' | 'changesMars' | 'cardsAndVariants';
};

// Public surfaces in our GameBoardView/PlayerHome, including the Venus track alongside Mars.
const OWN_BOARDS: ReadonlySet<GameModule> = new Set<GameModule>([
  'venus', 'colonies', 'turmoil', 'moon', 'pathfinders', 'deltaProject', 'venusPhase2', 'highOrbit', 'conglomerates',
]);
// Our GlobalParameter enum contains Venus and the three Moon rates beyond the base tracks.
const NEW_PARAMETERS: ReadonlySet<GameModule> = new Set<GameModule>(['venus', 'moon', 'venusPhase2']);

// These tile labels are not card names. In particular, Moon Mine's label collides with Mine.
const NON_CARD_TILES = new Map<TileType, GameModule | undefined>([
  [TileType.GREENERY, 'base'], [TileType.OCEAN, 'base'], [TileType.CITY, 'base'],
  [TileType.DUST_STORM_MILD, 'ares'], [TileType.DUST_STORM_SEVERE, 'ares'],
  [TileType.EROSION_MILD, 'ares'], [TileType.EROSION_SEVERE, 'ares'],
  [TileType.MINING_STEEL_BONUS, 'ares'], [TileType.MINING_TITANIUM_BONUS, 'ares'],
  [TileType.MOON_MINE, 'moon'], [TileType.MOON_HABITAT, 'moon'], [TileType.MOON_ROAD, 'moon'],
  [TileType.VENUS_CLOUD_CITY, 'venusPhase2'], [TileType.VENUS_GAS_MINE, 'venusPhase2'], [TileType.VENUS_FLOATER_ARRAY, 'venusPhase2'],
  // Persisted deprecated values and unsupported Automa content are not enabled expansion content.
  [TileType._DEPRECATED_MARTIAN_NATURE_WONDERS, undefined], [TileType._DEPRECATED_REY_SKYWALKER, undefined],
  [TileType.NEURAL_INSTANCE, undefined],
]);

/** Resolve the other tile types through our canonical card/standard-project names and modules. */
export function classifyTileTypes(cards: ReadonlyArray<Pick<ClientCard, 'name' | 'module'>>) {
  const cardModules = new Map<string, GameModule>(cards.map((card) => [card.name, card.module]));
  const modules = new Map<GameModule, Array<TileType>>();
  const unmapped: Array<TileType> = [];
  for (const tile of Object.values(TileType).filter((value): value is TileType => typeof value === 'number')) {
    const module = NON_CARD_TILES.has(tile) ? NON_CARD_TILES.get(tile) : cardModules.get(tileTypeToString[tile]);
    if (module === undefined) {
      if (!NON_CARD_TILES.has(tile)) {
        unmapped.push(tile);
      }
      continue;
    }
    const tiles = modules.get(module) ?? [];
    tiles.push(tile);
    modules.set(module, tiles);
  }
  return {modules, unmapped};
}

/** Additions beyond the base board; these are presentation facts, not expansion rules. */
export function expansionFeatures(module: GameModule, counts: {colonyTile?: number}, tileTypes: ReadonlyArray<TileType>): ExpansionFeatures {
  const traits = new Set<TraitKey>();
  if (OWN_BOARDS.has(module)) {
    traits.add('ownBoard');
  }
  if (NEW_PARAMETERS.has(module)) {
    traits.add('newParameters');
  }
  if (module === 'ares' || module === 'underworld' || (module !== 'base' && tileTypes.length > 0 && !traits.has('ownBoard'))) {
    traits.add('changesMars');
  }
  if (module !== 'base' && ((counts.colonyTile ?? 0) > 0 || tileTypes.length > 0 || module === 'underworld')) {
    traits.add('newTiles');
  }
  return {traits, tileTypes, layout: traits.has('ownBoard') ? 'ownBoard' : traits.has('changesMars') ? 'changesMars' : 'cardsAndVariants'};
}
