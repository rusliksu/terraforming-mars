import {Message} from '@/common/logs/Message';
import {TileType} from '@/common/TileType';
import type {SelectSpaceModel} from '@/common/models/PlayerInputModel';

type TileImage = {base: string; symbol?: string};

export type PlacementTile = 'greenery' | 'city' | 'ocean' | 'mine' | 'habitat' | 'road';

// required: hard rule · soft: "if possible" · bonus: something extra · card: special rule of the card being played
export type PlacementRuleKind = 'required' | 'soft' | 'bonus' | 'card';

export type PlacementRule = {
  kind: PlacementRuleKind,
  // Already a translation key (or the server's title message for card rules)
  text: string | Message,
};

export type PlacementGainIcon = 'oxygen' | 'tr' | 'mining-rate' | 'habitat-rate' | 'logistic-rate';

export type PlacementGain = {
  icon: PlacementGainIcon | undefined,
  // "+1" next to the icon; empty for pure text such as the ocean count
  value: string,
  label: string,
  // Parameters for the label (ocean count "3 → 4 of 9")
  labelParams?: ReadonlyArray<string>,
};

export type PlacementDescription = {
  nativeTileType?: TileType,
  // undefined: the title doesn't say which tile (e.g. "Select either Tharsis Tholus …", used by several cards);
  // special: a card's special tile (image in specialTile)
  tile: PlacementTile | 'special' | undefined,
  specialTile?: TileImage,
  // Translation key, or the server's title message when the tile is unknown
  title: string | Message,
  gains: ReadonlyArray<PlacementGain>,
  rules: ReadonlyArray<PlacementRule>,
};

/** Tile identity is supplied by our placement producer. No title-to-effect inference. */
export function nativePlacementDescription(input: SelectSpaceModel): PlacementDescription {
  const types: Partial<Record<TileType, PlacementTile>> = {
    [TileType.CITY]: 'city', [TileType.OCEAN]: 'ocean', [TileType.GREENERY]: 'greenery',
    [TileType.MOON_MINE]: 'mine', [TileType.MOON_HABITAT]: 'habitat', [TileType.MOON_ROAD]: 'road',
  };
  return {nativeTileType: input.tileType, tile: input.tileType === undefined ? undefined : types[input.tileType] ?? 'special',
    title: input.title, gains: [], rules: []};
}
