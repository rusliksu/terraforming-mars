<!-- Source per-player track layout; our existing native board owns its steps and reward descriptions. -->
<template>
  <div class="delta-board" :style="{'--delta-rows': rows.length}">
    <BoardTrackRow v-for="row in rows" :key="row.key" :name="row.name" :cells="cells(row.position)" :bonuses="{}"
      :class="['delta-board__row', 'player_translucent_bg_color_' + row.player.color, {'delta-board__row--self': row.player.color === viewerColor}]"
      :data-test="'delta-row-' + row.key">
      <template #image><span class="board-track-row__picture"><PlayerCube :color="row.player.color" view="slight" :size="22"/></span></template>
      <template #value><span>{{ row.position }}</span></template>
      <template #sub><span>{{ $t('Position') }}</span></template>
      <template #bonuses>
        <div class="delta-rewards">
          <span></span>
          <DeltaRewards v-for="(step, index) in steps" :key="index" :step="step" :done="index + 1 <= row.position"/>
        </div>
      </template>
    </BoardTrackRow>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import CanonicalDeltaBoard from '@/client/components/delta/DeltaProjectBoard.vue';
import type {Color} from '@/common/Color';
import type {PublicPlayerModel} from '@/common/models/PlayerModel';
import {cellState, TrackCell} from '@/client/wrybit/visuals/trackBonus/trackCell';
import BoardTrackRow from '@/client/wrybit/visuals/trackBonus/BoardTrackRow.vue';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import DeltaRewards from './DeltaRewards.vue';

type MarkerRow = {key: string, name: string, player: PublicPlayerModel, position: number};
export default defineComponent({
  name: 'DeltaBoard',
  extends: CanonicalDeltaBoard,
  components: {BoardTrackRow, PlayerCube, DeltaRewards},
  props: {viewerColor: {type: String as PropType<Color>, default: undefined}},
  computed: {
    rows(): Array<MarkerRow> {
      return this.players.flatMap((player) => {
        const rows: Array<MarkerRow> = [{key: player.color, name: player.name, player, position: player.deltaProject?.position ?? 0}];
        if (player.epsilonDample !== undefined) {
          rows.push({key: player.color + '-epsilon', name: player.name + ' · Epsilon Dample', player, position: player.epsilonDample.position});
        }
        return rows;
      });
    },
  },
  methods: {
    cells(position: number): Array<TrackCell> {
      return [{label: '0', state: cellState(0, position)}, ...this.steps.map((step, index) => ({
        label: step.vpValue === undefined ? undefined : String(step.vpValue),
        icon: step.tag === undefined ? undefined : 'tags/' + step.tag + '.png', state: cellState(index + 1, position), reward: true,
      }))];
    },
  },
});
</script>
