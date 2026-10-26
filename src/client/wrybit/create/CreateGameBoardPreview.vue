<template>
  <div class="create-game-board-preview">
    <div v-if="binding.data !== undefined && binding.showBoardName" class="create-game-board-preview-head">
      <span :class="boardColorClass(binding.data.boardName)"></span>
      <span class="capitalized" v-i18n>{{ binding.data.boardName }}</span>
    </div>
    <ScaledBoard v-if="binding.data !== undefined" :class="{'create-game-board-preview--loading': binding.loading}"
      :spaces="binding.data.spaces" :boardName="binding.data.boardName" :customBoardRows="binding.data.customBoardRows" :globalParameters="binding.data.globalParameters"
      :planetOnly="true" :maxScale="2" :maxPlanetShare="0.9"/>
    <p v-if="binding.data?.randomExample" class="create-game-note" v-i18n>A random board will be drawn when creating the game.</p>
    <button v-if="binding.data !== undefined && binding.canRedraw" type="button" class="create-game-icon-button create-game-board-preview-reroll"
      :title="$t('Draw again')" :aria-label="$t('Draw again')" @click="binding.redraw()">
      <svg class="create-game-head-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></svg>
    </button>
    <p v-if="binding.error !== undefined" class="create-game-note"><span v-i18n>The board could not be loaded.</span> {{ binding.error }}</p>
  </div>
</template>

<script setup lang="ts">
import type {BoardName} from '@/common/boards/BoardName';
import type {CreationBoardPreview} from './presentation';
import ScaledBoard from '@/client/wrybit/visuals/board/ScaledBoard.vue';

// Pure source presentation. Our projection supplies geometry, status and the redraw command.
defineProps<{binding: CreationBoardPreview, boardColorClass: (board: BoardName) => string}>();
</script>
