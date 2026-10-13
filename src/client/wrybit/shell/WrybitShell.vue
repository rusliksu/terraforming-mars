<template>
  <AppBackground v-if="hasBackground" :always="screen === 'start-screen'" :show-credit="true" />
  <aside class="wrybit-mode-switch" :data-screen="screen" data-wrybit-shell>
    <button type="button" class="btn" @click="$emit('classic')" v-i18n>Classic layout</button>
  </aside>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import AppBackground from '@/client/wrybit/shell/AppBackground.vue';

const props = defineProps<{screen: string}>();
defineEmits<{classic: []}>();

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
