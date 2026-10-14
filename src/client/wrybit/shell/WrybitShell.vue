<template>
  <AppBackground v-if="hasBackground" :always="screen === 'start-screen'" :show-credit="screen === 'start-screen'" />
  <aside v-if="screen !== 'cards'" class="wrybit-mode-switch" :data-screen="screen" data-wrybit-shell>
    <button type="button" class="btn" @click="$emit('classic')" v-i18n>Classic layout</button>
  </aside>
</template>

<script setup lang="ts">
import {computed, markRaw, onMounted} from 'vue';
import AppBackground from '@/client/wrybit/shell/AppBackground.vue';
import Catalog from '@/client/wrybit/visuals/cardlist/CardList.vue';
import type {WrybitViews} from './presentationViews';

const props = defineProps<{screen: string}>();
const emit = defineEmits<{classic: []; views: [views: WrybitViews]}>();
onMounted(() => emit('views', {cards: markRaw(Catalog)}));

const hasBackground = computed(() => [
  'start-screen', 'create-game-form', 'game-home', 'player-home', 'spectator-home',
  'the-end', 'games-overview', 'cards', 'load',
].includes(props.screen));
</script>

<style scoped>
.wrybit-mode-switch {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 30;
}
</style>

<style lang="less" src="./background.less"></style>
