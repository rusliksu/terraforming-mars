<template>
  <div class="select_space_cont">
    <SpaceConfirmPopover :anchor="binding.automatic ? undefined : binding.anchor" :geometryRevision="zoomSurface?.revision.value" :busy="accepting"
      @accept="accept" @dismiss="binding.dismiss()" @hide="binding.hide($event)"/>
    <div v-if="binding.showtitle" class="wf-select-space">
      {{ $t(binding.playerinput.title) }}
      <GoToMap :playerinput="binding.playerinput"/>
    </div>
    <div v-if="zoomBoard !== undefined" class="select-space-zoom">
      <button type="button" class="btn btn-submit btn-rounded select-space-zoom-button" @click="enlarge">
        <span class="select-space-zoom-action">{{ $t(binding.playerinput.title) }}</span>
        <span class="select-space-zoom-next-step">{{ $t(zoomBoard === 'moon' ? 'Show the Moon enlarged and choose a space' : zoomBoard === 'mars' ? 'Show Mars enlarged and choose a space' : 'Show board enlarged and choose a space') }}</span>
      </button>
    </div>
    <div v-if="binding.warning" class="nes-container is-rounded">
      <span class="nes-text is-warning" v-i18n>{{ binding.warning }}</span>
      <GoToMap :playerinput="binding.playerinput"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {SpaceBinding} from './presentation';
import SpaceConfirmPopover from '@/client/wrybit/visuals/SpaceConfirmPopover.vue';
import GoToMap from '@/client/components/waitingFor/GoToMap.vue';
import {computed, onBeforeUnmount, ref, watch} from 'vue';
import {boardZoomSurface, ZoomBoard} from '@/client/wrybit/visuals/board/boardZoomSurface';

const props = defineProps<{binding: SpaceBinding}>();
const zoomSurface = computed(() => boardZoomSurface(props.binding.playerView.game.gameId));
const zoomBoard = computed((): ZoomBoard | undefined => {
  const game = props.binding.playerView.game;
  const offered = new Set(props.binding.playerinput.spaces);
  if (zoomSurface.value?.boards.includes('mars') && game.spaces.some((space) => offered.has(space.id))) {
    return 'mars';
  }
  if (zoomSurface.value?.boards.includes('moon') && game.moon?.spaces.some((space) => offered.has(space.id))) {
    return 'moon';
  }
  if (zoomSurface.value?.boards.includes('venus') && game.venusPhase2?.spaces.some((space) => offered.has(space.id))) {
    return 'venus';
  }
  return undefined;
});
const accepting = ref(false);
const zoomOwner = Symbol('placement-zoom-owner');
let alive = true;
watch([() => props.binding.anchor, () => props.binding.automatic, accepting], ([anchor, automatic, busy]) => {
  if (alive && anchor !== undefined && automatic && !busy) {
    void accept();
  }
}, {immediate: true});
onBeforeUnmount(() => {
  alive = false;
  void zoomSurface.value?.close(zoomOwner);
});
function enlarge() {
  if (zoomBoard.value !== undefined) {
    zoomSurface.value?.open(zoomBoard.value, props.binding.playerinput, zoomOwner);
  }
}
async function accept() {
  if (accepting.value) {
    return;
  }
  accepting.value = true;
  const confirm = props.binding.accept;
  await zoomSurface.value?.close(zoomOwner);
  if (alive) {
    confirm();
  }
  accepting.value = false;
}
</script>
