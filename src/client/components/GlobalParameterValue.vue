<template>
  <div :title="$t(title)">
    <div :class="iconClass"></div>
    <div class="global_params_value">
      <div v-if="isMax">
        <img src="assets/misc/checkmark.png" class="checkmark" :alt="$t('Completed!')">
      </div>
      <div v-else>
        {{ value }}{{ suffix }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {GlobalParameter} from '@/common/GlobalParameter';
import {BoardName} from '@/common/boards/BoardName';
import {getGlobalParameterMaximums} from '@/common/boards/GlobalParameterMaximums';

type BaseGlobalParameter = 'temperature' | 'oxygen' | 'oceans' | 'venus';

const attributes: Record<BaseGlobalParameter, {title: string, iconClass: string}> = {
  [GlobalParameter.TEMPERATURE]: {title: 'Temperature', iconClass: 'temperature-tile'},
  [GlobalParameter.OXYGEN]: {title: 'Oxygen Level', iconClass: 'oxygen-tile'},
  [GlobalParameter.OCEANS]: {title: 'Oceans', iconClass: 'ocean-tile'},
  [GlobalParameter.VENUS]: {title: 'Venus Scale', iconClass: 'venus-tile'},
};

export default defineComponent({
  name: 'GlobalParameterValue',
  props: {
    param: {
      type: String as () => BaseGlobalParameter,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    // Custom maps (Map Editor) and Venus Phase 2 give the game its own track maximums, which
    // win over the board's; without one the maximum comes from the board (Amazonis raises them).
    max: {
      type: Number,
      required: false,
    },
    boardName: {
      type: String as () => BoardName,
      required: true,
    },
  },
  computed: {
    // Maximum value of this parameter: the game's own track maximum when it defines one
    // (custom maps, Venus Phase 2), otherwise the board's (the larger maps raise them).
    maximum(): number {
      if (this.max !== undefined) {
        return this.max;
      }
      const maximums = getGlobalParameterMaximums(this.boardName);
      const byParam: Record<BaseGlobalParameter, number> = {
        [GlobalParameter.TEMPERATURE]: maximums.temperature,
        [GlobalParameter.OXYGEN]: maximums.oxygen,
        [GlobalParameter.OCEANS]: maximums.oceans,
        [GlobalParameter.VENUS]: maximums.venus,
      };
      return byParam[this.param];
    },
    isMax(): boolean {
      return this.value === this.maximum;
    },
    title(): string {
      return attributes[this.param].title;
    },
    iconClass(): string {
      return attributes[this.param].iconClass;
    },
    suffix(): string {
      return this.param === GlobalParameter.OXYGEN || this.param === GlobalParameter.VENUS ? '%' : '';
    },
  },
});

</script>
