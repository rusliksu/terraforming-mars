<template>
  <div :class="klass" :title="$t(description)" data-test="tile">
    <AdjacencyBonus v-if="aresExtension && tileType !== undefined" :tileType="tileType" />
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {SpaceType} from '@/common/boards/SpaceType';
import {TileType, tileTypeToString} from '@/common/TileType';
import {SpaceHighlight, SpaceModel} from '@/common/models/SpaceModel';
import {TileView} from '@/client/components/board/TileView';
import AdjacencyBonus from '@/client/components/AdjacencyBonus.vue';

const tileTypeToCssClass: Record<TileType, string> = {
  [TileType.OCEAN]: 'ocean',
  [TileType.CITY]: 'city',
  [TileType.GREENERY]: 'greenery',
  [TileType.COMMERCIAL_DISTRICT]: 'commercial_district',
  [TileType.ECOLOGICAL_ZONE]: 'ecological_zone',
  [TileType.INDUSTRIAL_CENTER]: 'industrial_center',
  [TileType.LAVA_FLOWS]: 'lava_flows',
  [TileType.MINING_AREA]: 'mining_area',
  [TileType.MINING_RIGHTS]: 'mining_rights',
  [TileType.CAPITAL]: 'capital',
  [TileType.MOHOLE_AREA]: 'mohole_area',
  [TileType.NATURAL_PRESERVE]: 'natural_preserve',
  [TileType.NUCLEAR_ZONE]: 'nuclear_zone',
  [TileType.RESTRICTED_AREA]: 'restricted_area',
  [TileType.DEIMOS_DOWN]: 'deimos_down',
  [TileType.GREAT_DAM]: 'great_dam',
  [TileType.MAGNETIC_FIELD_GENERATORS]: 'magnetic_field_generators',
  [TileType.BIOFERTILIZER_FACILITY]: 'biofertilizer-facility',
  [TileType.METALLIC_ASTEROID]: 'metallic-asteroid',
  [TileType.SOLAR_FARM]: 'solar-farm',
  [TileType.OCEAN_CITY]: 'ocean-city',
  [TileType.OCEAN_FARM]: 'ocean-farm',
  [TileType.OCEAN_SANCTUARY]: 'ocean-sanctuary',
  [TileType.DUST_STORM_MILD]: 'dust-storm-mild',
  [TileType.DUST_STORM_SEVERE]: 'dust-storm-severe',
  [TileType.EROSION_MILD]: 'erosion-mild',
  [TileType.EROSION_SEVERE]: 'erosion-severe',
  [TileType.MINING_STEEL_BONUS]: 'mining-steel',
  [TileType.MINING_TITANIUM_BONUS]: 'mining-titanium',
  [TileType.WETLANDS]: 'wetlands',
  [TileType.RED_CITY]: 'red-city',
  [TileType._DEPRECATED_MARTIAN_NATURE_WONDERS]: '',
  [TileType.MOON_ROAD]: 'road',
  [TileType.MOON_HABITAT]: 'habitat',
  [TileType.MOON_MINE]: 'mine',
  [TileType.LUNA_TRADE_STATION]: 'luna-trade-station',
  [TileType.LUNA_MINING_HUB]: 'luna-mining-hub',
  [TileType.LUNA_TRAIN_STATION]: 'luna-train-station',
  [TileType.LUNAR_MINE_URBANIZATION]: 'lunar-mine-urbanization',
  [TileType.CRASHLANDING]: 'crashlanding',
  [TileType.MARS_NOMADS]: '', // This never actually renders.
  [TileType._DEPRECATED_REY_SKYWALKER]: '',
  [TileType.MAN_MADE_VOLCANO]: 'man-made-volcano',
  [TileType.NEW_HOLLAND]: 'new-holland',
  [TileType.NEURAL_INSTANCE]: 'neural-instance',
  [TileType.GARBAGE_DUMP]: 'garbage_dump',
  [TileType.PUMPING_HUB]: 'pumping_hub',
  [TileType.INVAK_CITY]: 'city', // No dedicated art; renders as a plain city tile.
  [TileType.SUBURBS]: 'greenery', // No dedicated art; sits over the player's own greenery tile.
  // Harbor Borealis's source art has a visible Getty Images watermark, so it isn't wired up
  // yet -- still using the ocean/city hybrid icon as a placeholder pending a clean asset.
  [TileType.HARBOR_BOREALIS]: 'ocean-city',
  [TileType.INDUSTRIAL_METROPOLIS]: 'industrial_metropolis',
  [TileType.PARADISE_CITY]: 'paradise_city',
  [TileType.ANIMAL_DOME]: 'animal_dome',
  [TileType.SEDIMENT]: 'sediment',
  [TileType.BIOLOGICAL_DOME]: 'biological_dome',
  // Real art exists (see assets/venusPhase2/ once wired up) but the CSS/asset plumbing for the
  // Venus surface board is a later pass -- these class names are placeholders pending that.
  [TileType.VENUS_CLOUD_CITY]: 'venus-cloud-city',
  [TileType.VENUS_GAS_MINE]: 'venus-gas-mine',
  [TileType.VENUS_FLOATER_ARRAY]: 'venus-floater-array',
  [TileType.INDUSTRY_HEAT]: 'industry_heat',
  [TileType.INDUSTRY_MONEY]: 'industry_money',
  [TileType.INDUSTRY_ENERGY]: 'industry_energy',
  [TileType.INDUSTRY_STEEL]: 'industry_steel',
  [TileType.INDUSTRY_PLANT]: 'industry_plant',
  [TileType.INDUSTRY_TITANIUM]: 'industry_titanium',
  [TileType.INDUSTRY_WILD]: 'industry_wild',
  [TileType.MENAGERIE]: 'greenery', // No dedicated art; sits over the player's own greenery tile.
};

const tileTypeToCssClassAresOverride = new Map<TileType, string>([
  [TileType.COMMERCIAL_DISTRICT, 'commercial-district-ares'],
  [TileType.DEIMOS_DOWN, 'deimos-down-ares'],
  [TileType.ECOLOGICAL_ZONE, 'ecological-zone-ares'],
  [TileType.GREAT_DAM, 'great-dam-ares'],
  [TileType.INDUSTRIAL_CENTER, 'industrial-center-ares'],
  [TileType.LAVA_FLOWS, 'lava-flows-ares'],
  [TileType.CAPITAL, 'capital-ares'],
  [TileType.MOHOLE_AREA, 'mohole-area-ares'],
  [TileType.NATURAL_PRESERVE, 'natural-preserve-ares'],
  [TileType.NUCLEAR_ZONE, 'nuclear-zone-ares'],
  [TileType.RESTRICTED_AREA, 'restricted-area-ares'],
  [TileType.MAGNETIC_FIELD_GENERATORS, 'magnetic-field-generators-ares'],
]);

const descriptions: Record<TileType, string> = {
  ...tileTypeToString,
  [TileType.COMMERCIAL_DISTRICT]: 'Commercial District: 1 VP per adjacent city tile',
  [TileType.CITY]: 'City: 1 VP per adjacent greenery',
  [TileType.GREENERY]: 'Greenery: 1 VP',
  [TileType.OCEAN]: 'Ocean: grants 2M€ when players put tiles next to it',
  [TileType.OCEAN_CITY]: 'Ocean City: counts as an ocean and a city.',
  [TileType.DUST_STORM_MILD]: 'Mild Dust Storm: lose 1 production when placing next to it. Pay 8M€ to place over it.',
  [TileType.DUST_STORM_SEVERE]: 'Severe Dust Storm: lose 2 production when placing next to it. Pay 16M€ to place over it.',
  [TileType.EROSION_MILD]: 'Mild Erosion: lose 1 production when placing next to it. Pay 8M€ to place over it.',
  [TileType.EROSION_SEVERE]: 'Severe Erosion: lose 2 production when placing next to it. Pay 16M€ to place over it.',
  [TileType.MINING_STEEL_BONUS]: 'Mining: steel bonus',
  [TileType.MINING_TITANIUM_BONUS]: 'Mining: titanium bonus',
  [TileType.MOON_MINE]: 'Moon Mine: 1 VP per adjacent road',
  [TileType.MOON_HABITAT]: 'Moon Habitat: 1 VP per adjacent road',
  [TileType.MOON_ROAD]: 'Moon Road: 1 VP',
  [TileType.LUNA_TRAIN_STATION]: 'Luna Train Station: 2 VP per adjacent road',
  [TileType.LUNAR_MINE_URBANIZATION]: 'Luna Mine Urbanization: counts as both a colony and a mine tile.',

  [TileType.WETLANDS]: 'Wetlands: counts as an ocean and a greenery. Does not count toward 9 oceans.',
  [TileType.RED_CITY]: 'Red City: 1 VP per empty adjacent area. No greeneries may be placed next to it.',
  [TileType.NEW_HOLLAND]: 'New Holland: counts as an ocean and a city',
  [TileType.NEURAL_INSTANCE]: 'Neural Instance: MarsBot gains VP for adjacent non-human spaces',
  [TileType.INVAK_CITY]: 'Invak City: counts as a city and a greenery',
  [TileType.ANIMAL_DOME]: 'Animal Dome: placed next to no other tile. Adjacency bonus: 1 animal',
  [TileType.INDUSTRY_HEAT]: 'Heat Industry: raises heat production, distributes heat nearby',
  [TileType.INDUSTRY_MONEY]: 'Money Industry: raises M€ production, distributes M€ nearby',
  [TileType.INDUSTRY_ENERGY]: 'Energy Industry: raises energy production, distributes energy nearby',
  [TileType.INDUSTRY_STEEL]: 'Steel Industry: raises steel production, distributes steel nearby',
  [TileType.INDUSTRY_PLANT]: 'Plant Industry: raises plant production, distributes plants nearby',
  [TileType.INDUSTRY_TITANIUM]: 'Titanium Industry: raises titanium production, distributes titanium nearby',
  [TileType.INDUSTRY_WILD]: 'Wild Industry: raises a chosen production, distributes that resource nearby',
};

export default defineComponent({
  name: 'BoardSpaceTile',
  props: {
    space: {
      type: Object as () => SpaceModel,
      required: true,
    },
    aresExtension: {
      type: Boolean,
    },
    tileView: {
      type: String as () => TileView,
      default: 'show',
    },
  },
  data() {
    return {};
  },
  components: {
    AdjacencyBonus,
  },
  computed: {
    tileType(): TileType | undefined {
      return this.space.tileType;
    },
    spaceType(): SpaceType {
      return this.space.spaceType;
    },
    highlight(): SpaceHighlight {
      return this.space.highlight;
    },
    description(): string {
      if (this.tileType === undefined) {
        return '';
      }
      if (this.tileType === TileType.CITY && this.spaceType === SpaceType.COLONY) {
        return 'City in space.';
      }
      return descriptions[this.tileType];
    },
    klass(): string {
      let css = 'board-space';
      if (this.tileType !== undefined) {
        let cssClass: string | undefined = tileTypeToCssClass[this.tileType];
        if (this.aresExtension && tileTypeToCssClassAresOverride.has(this.tileType)) {
          cssClass = tileTypeToCssClassAresOverride.get(this.tileType);
        }
        // Special case Crashlanding rotation
        if (this.tileType === TileType.CRASHLANDING && this.space.rotated === true) {
          cssClass += '-rotated';
        }
        css += ' board-space-tile--' + cssClass;
      } else {
        switch (this.spaceType) {
        case SpaceType.OCEAN:
          css += ' board-space-type-ocean';
          break;
        case SpaceType.COVE:
          if (this.highlight !== 'volcanic') {
            // Custom for Arabia Terra's space Tikhonarov.
            css += ' board-space-type-cove';
          } else {
            css += ' board-space-type-volcanic-cove';
          }
          break;
        case SpaceType.RESTRICTED:
          break;
        case SpaceType.GASLIGHT:
          css += ' board-space-type-gaslight';
          break;
        default:
          css += ' board-space-type-land';

          if (this.highlight) {
            css += ` board-space-type-land-${this.highlight}`;
          }
        }
      }
      if (this.tileView !== 'show') {
        css += ' board-hidden-tile';
      }
      return css;
    },
  },
});

</script>
