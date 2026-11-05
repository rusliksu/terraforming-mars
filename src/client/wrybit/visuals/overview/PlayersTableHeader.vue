<template>
  <!-- Table controls above the rows: the game menu. The sections (resources, score, tags) are always
       shown – they only give way when the window is too narrow (playersTableLayout.ts: fitToWidth). -->
  <div class="players-table-controls">
    <GameMenu />
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import GameMenu from '@/client/wrybit/visuals/gameMenu/GameMenu.vue';

export default defineComponent({
  name: 'PlayersTableHeader',
  components: {
    GameMenu,
  },
});
</script>
