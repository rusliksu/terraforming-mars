import {Color} from '@/common/Color';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {TRSource} from '@/common/cards/TRSource';
import {SpaceId} from '@/common/Types';

/** Own-player intrinsic facts for standard ocean placements on the current board. */
export type OceanPlacementContextModel = {
  version: 1;
  color: Color;
  generation: number;
  step: number;
  oceans: number;
  maxOceans: number;
  /** Intrinsic ocean counts from isolated temperature rises, excluding placement rewards. */
  temperatureBonus?: {
    temperature: number;
    maxTemperature: number;
    rises: ReadonlyArray<{steps: 1 | 2 | 3; oceans: number}>;
  };
  /** Structurally available cells, not proof of post-card affordability. */
  spaces: ReadonlyArray<{
    id: SpaceId;
    bonus: ReadonlyArray<SpaceBonus>;
    oceanAdjacencyBonus: number;
    /** False when a political placement payment is not included in `additionalCosts`. */
    costsKnown: boolean;
    additionalCosts: {
      megacredits: number;
      production: {mild: number; severe: number};
      tr: TRSource;
    };
  }>;
  /** Ordered pairs with unchanged printed bonuses/costs and the second adjacency payout. */
  pairs?: ReadonlyArray<{
    firstSpaceId: SpaceId;
    secondSpaceId: SpaceId;
    secondOceanAdjacencyBonus: number;
  }>;
};
