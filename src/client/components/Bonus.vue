<template>
  <div class='board-space-bonuses'>
    <i
      v-for="(item, idx) in items"
      :key="idx"
      :class="getClass(idx + 1, item)"
      :style="getStyle(idx)"
    ><b v-if="item.bonus === MEGACREDITS" class="board-space-bonus-count">{{ item.count }}</b></i>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {groupSpaceBonuses, GroupedSpaceBonus} from '@/client/utils/spaceBonusIcon';

const css: Record<SpaceBonus, string> = {
  [SpaceBonus.TITANIUM]: 'titanium',
  [SpaceBonus.STEEL]: 'steel',
  [SpaceBonus.PLANT]: 'plant',
  [SpaceBonus.DRAW_CARD]: 'card',
  [SpaceBonus.HEAT]: 'heat',
  [SpaceBonus.OCEAN]: 'bonusocean',
  [SpaceBonus.MEGACREDITS]: 'megacredit',
  [SpaceBonus.ANIMAL]: 'animal',
  [SpaceBonus.MICROBE]: 'microbe',
  [SpaceBonus.ENERGY]: 'energy',
  [SpaceBonus.DATA]: 'data',
  [SpaceBonus.SCIENCE]: 'science',
  [SpaceBonus.ENERGY_PRODUCTION]: 'energy-production',
  [SpaceBonus.TEMPERATURE]: 'bonustemperature',
  [SpaceBonus.ASTEROID]: 'asteroid',
  [SpaceBonus.DELEGATE]: 'delegate',
  [SpaceBonus.COLONY]: 'colony',
  [SpaceBonus._RESTRICTED]: '', // RESTRICTED is just a that a space is empty, not an actual bonus.
  [SpaceBonus.TEMPERATURE_4MC]: 'bonustemperature4mc',
  [SpaceBonus.FLOATER]: 'floater',
};

// Icon size/spacing used once a space has more bonus icons than the hand-tuned 3-icon
// triangle (below) can hold, so a 4th+ icon lands in a compact grid instead of overflowing
// off the tile. Kept in sync with `.board-space-bonus--compact` in board.less.
const GRID_ICON_SIZE = 12;
const GRID_GAP = 2;
const GRID_STEP = GRID_ICON_SIZE + GRID_GAP;
const HEX_WIDTH = 46;
const HEX_VERTICAL_CENTER = 27; // Matches the triangle layout's visual center below.

export default defineComponent({
  name: 'Bonus',
  props: {
    bonus: {
      type: Array as () => Array<SpaceBonus>,
      required: true,
    },
  },
  computed: {
    MEGACREDITS: () => SpaceBonus.MEGACREDITS,
    items(): Array<GroupedSpaceBonus> {
      return groupSpaceBonuses(this.bonus);
    },
  },
  methods: {
    getClass(idx: number, item: GroupedSpaceBonus): string {
      const doubleWideBonuses = [
        SpaceBonus.OCEAN,
        SpaceBonus.TEMPERATURE,
        SpaceBonus.TEMPERATURE_4MC,
        SpaceBonus.COLONY,
      ];
      const total = this.items.length;
      // If only one bonus is present, center it.
      // Except: some bonuses occupy 2 spaces.
      let position: string | number = idx;
      if (total === 1 && !doubleWideBonuses.includes(item.bonus)) {
        position = 'only';
      } else if (total > 3) {
        // Beyond the hand-tuned 3-icon triangle, fall back to a computed grid (getStyle)
        // so extra icons stay on the tile instead of running off it.
        position = 'grid';
      }
      const compact = total > 3 ? ' board-space-bonus--compact' : '';
      return `board-space-bonus board-space-bonus--${css[item.bonus]} board-space-bonus-pos--${position}${compact}`;
    },
    getStyle(idx: number): Record<string, string> | undefined {
      const total = this.items.length;
      if (total <= 3) {
        return undefined;
      }
      const cols = total <= 4 ? 2 : 3;
      const rows = Math.ceil(total / cols);
      const gridWidth = cols * GRID_STEP - GRID_GAP;
      const gridHeight = rows * GRID_STEP - GRID_GAP;
      const startX = (HEX_WIDTH - gridWidth) / 2;
      const startY = HEX_VERTICAL_CENTER - gridHeight / 2;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      return {
        left: `${startX + col * GRID_STEP}px`,
        top: `${startY + row * GRID_STEP}px`,
      };
    },
  },
});

</script>
