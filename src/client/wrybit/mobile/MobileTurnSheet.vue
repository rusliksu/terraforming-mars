<template>
  <div class="mb-sheet" role="dialog" aria-modal="true">
    <!-- Turn menu as a bottom sheet over the current screen: actions worthwhile now first (colored),
         then all others in a grid, at the very bottom subtly turn end (left skip second action, right pass). -->
    <button type="button" class="mb-sheet-backdrop" :aria-label="$t('Close')" @click="$emit('close')"></button>
    <div class="mb-sheet-drawer">
      <button type="button" class="mb-sheet-turn" :aria-label="$t('Close')" @click="$emit('close')">
        <MobileTurnButton :acting="menu !== undefined" :action-number="actionNumber" :actions-per-turn="actionsPerTurn" />
      </button>
      <div class="mb-sheet-panel">
        <template v-if="confirming !== undefined && confirming.confirmation !== undefined">
          <CardIntroBlock v-if="confirming.confirmation.card !== undefined" class="mb-sheet-intro"
            :card="confirming.confirmation.card" :title="confirming.confirmation.title" />
          <div v-else class="mb-sheet-head">
            <span class="mb-sheet-title">{{ $t(confirming.confirmation.title) }}</span>
          </div>
          <p v-if="confirming.confirmation.hint !== undefined" class="mb-sheet-hint">{{ $t(confirming.confirmation.hint) }}</p>
          <div class="mb-sheet-confirm">
            <button type="button" class="mb-taskbar-back" :aria-label="$t('Back')" @click="confirming = undefined">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" class="btn btn-rounded mb-sheet-confirm-button"
              :class="confirming.tone !== undefined ? 'btn-tone-' + confirming.tone : ''"
              @click="$emit('confirm', confirming.index)">{{ $t(confirming.confirmation.button) }}</button>
          </div>
        </template>
        <div v-else class="mb-sheet-head">
          <span class="mb-sheet-title">{{ title }}</span>
        </div>
        <!-- Not your turn: only who is currently acting, instead of an empty action menu -->
        <div v-if="menu === undefined" class="mb-sheet-group">
          <span class="mb-section-label">{{ $t('Waiting for other players') }}</span>
          <div class="mb-waiting-list">
            <span v-for="player in waitingPlayers" :key="player.color" :class="['mb-waiting-player', 'player_bg_color_' + player.color]">{{ player.name }}</span>
          </div>
        </div>
        <template v-else-if="confirming === undefined">
          <div v-if="menu.available.length > 0" class="mb-sheet-list">
            <MobileTurnTile v-for="tile in menu.available" :key="tile.index" :tile="tile" @select="choose(tile)" />
          </div>
          <div v-if="menu.actions.length > 0" class="mb-sheet-group">
            <span class="mb-section-label">{{ $t('Actions') }}</span>
            <div class="mb-sheet-grid">
              <MobileTurnTile v-for="tile in menu.actions" :key="tile.index" :tile="tile" @select="choose(tile)" />
            </div>
          </div>
          <div v-if="menu.pass !== undefined || menu.skip !== undefined" class="mb-sheet-end">
            <!-- Pass on is only available after the first action; until then visible but disabled (labels as on desktop) -->
            <MobileTurnTile v-if="menu.skip !== undefined" :tile="menu.skip" :compact="true" class="mb-tile--skip" @select="choose(menu.skip)" />
            <button v-else type="button" class="mb-tile mb-tile--skip" disabled><span class="mb-tile-label">{{ $t('Pass on') }}</span></button>
            <MobileTurnTile v-if="menu.pass !== undefined" :tile="menu.pass" :compact="true" class="mb-tile--pass" @select="choose(menu.pass)" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {TurnMenu, TurnMenuTile} from '@/client/wrybit/mobile/turnMenu';
import MobileTurnTile from '@/client/wrybit/mobile/MobileTurnTile.vue';
import MobileTurnButton from '@/client/wrybit/mobile/MobileTurnButton.vue';
import CardIntroBlock from '@/client/wrybit/inputs/CardIntroBlock.vue';
import {PublicPlayerModel} from '@/common/models/PlayerModel';

withDefaults(defineProps<{
  // Action menu; if missing, it's not your turn and the sheet only shows who is being waited for
  menu?: TurnMenu;
  waitingPlayers?: ReadonlyArray<PublicPlayerModel>;
  title: string;
  actionNumber: number | undefined;
  actionsPerTurn: number;
}>(), {
  menu: undefined,
  waitingPlayers: () => [],
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'select', index: number): void;
  // Trigger the action after the confirmation
  (event: 'confirm', index: number): void;
}>();

// Action whose confirmation is currently open
const confirming = ref<TurnMenuTile | undefined>(undefined);

// Actions without a choice ask for confirmation in the sheet, all others open their task
function choose(tile: TurnMenuTile): void {
  if (tile.confirmation !== undefined) {
    confirming.value = tile;
  } else {
    emit('select', tile.index);
  }
}
</script>
