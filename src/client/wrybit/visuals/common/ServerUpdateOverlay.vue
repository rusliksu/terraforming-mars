<template>
  <!-- Covers the whole page while the server restarts: no move can be started that would get lost -->
  <div v-if="phase !== 'none'" class="server-update-overlay" role="alertdialog" aria-modal="true">
    <div class="server-update-overlay__card" role="status">
      <template v-if="phase === 'updating'">
        <div class="server-update-overlay__title" v-i18n>The server is being updated</div>
        <LoadingBar class="server-update-overlay__progress" />
        <div class="server-update-overlay__hint">
          <span v-i18n>Please wait a moment.</span>
          <span v-if="savedMessage">{{ $t(savedMessage) }}</span>
        </div>
      </template>
      <template v-else>
        <svg class="server-update-overlay__check" width="56" height="56" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="22" />
          <path d="M14 25 l7 7 l13 -15" />
        </svg>
        <div class="server-update-overlay__title" v-i18n>Server updated successfully</div>
        <!-- Requests reload from our App owner; this view never reloads the page itself. -->
        <button class="btn btn-submit btn-rounded server-update-overlay__reload" @click="reload">
          <span class="server-update-overlay__reload-progress" @animationend="reload"></span>
          <span class="server-update-overlay__reload-label" v-i18n>Reload</span>
        </button>
        <div class="server-update-overlay__hint">
          <span v-if="savedMessage">{{ $t(savedMessage) }}</span>
          <span v-i18n>After reloading, play continues seamlessly.</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingBar from './LoadingBar.vue';
withDefaults(defineProps<{phase?: 'none' | 'updating' | 'ready'; savedMessage?: string}>(), {phase: 'none', savedMessage: undefined});
const emit = defineEmits<{reload: []}>();
function reload(): void {
  emit('reload');
}
</script>
