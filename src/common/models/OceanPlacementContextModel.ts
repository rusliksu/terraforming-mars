import {Color} from '@/common/Color';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {TRSource} from '@/common/cards/TRSource';
import {SpaceId} from '@/common/Types';

/** Own-player facts for one standard ocean placement on the current board. */
export type OceanPlacementContextModel = {
  version: 1;
  color: Color;
  generation: number;
  step: number;
  oceans: number;
  maxOceans: number;
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
};
