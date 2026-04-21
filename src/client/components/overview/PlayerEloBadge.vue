<template>
  <span
    v-if="eloText"
    class="player-elo-badge"
    :class="tooltipCss"
    :data-tooltip="eloTooltip"
    :style="badgeStyle"
  >{{ eloText }}</span>
</template>

<script lang="ts">
import {defineComponent} from '@/client/vue3-compat';
import {EloEntry, ensureEloLoaded, fallbackEloEntry, lookupEloEntry, sharedEloState} from '@/client/utils/elo';

export default defineComponent({
  name: 'PlayerEloBadge',
  props: {
    playerName: {
      type: String,
      required: false,
      default: '',
    },
    tooltipCss: {
      type: String,
      required: true,
    },
  },
  mounted() {
    void ensureEloLoaded();
  },
  computed: {
    eloEntry(): EloEntry | null {
      return lookupEloEntry(sharedEloState.players, this.playerName);
    },
    effectiveEloEntry(): EloEntry | null {
      if (this.eloEntry) return this.eloEntry;
      if (!sharedEloState.loaded && !sharedEloState.failed) return null;
      return fallbackEloEntry(this.playerName);
    },
    eloText(): string {
      const elo = this.effectiveEloEntry?.elo;
      return typeof elo === 'number' ? String(elo) : '';
    },
    eloTooltip(): string {
      const entry = this.effectiveEloEntry;
      if (!entry || typeof entry.elo !== 'number') return '';

      let text = 'Elo: ' + entry.elo;
      if (typeof entry.games === 'number') text += ' | Games: ' + entry.games;
      if (typeof entry.games === 'number' && entry.games > 0 && typeof entry.avgPlaceScore === 'number') {
        text += ' | Avg place: ' + entry.avgPlaceScore.toFixed(2);
      }
      if (typeof entry.games === 'number' && entry.games > 0 && typeof entry.totalVP === 'number') {
        text += ' | Avg VP: ' + Math.round(entry.totalVP / entry.games);
      }
      return text;
    },
    badgeStyle(): Record<string, string> {
      const elo = this.effectiveEloEntry?.elo ?? 0;
      let color = '#f44336';
      if (elo >= 1550) color = '#4caf50';
      else if (elo >= 1450) color = '#ffc107';

      return {
        color,
        borderColor: color,
      };
    },
  },
});
</script>

<style scoped>
.player-elo-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  min-height: 18px;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid currentColor;
  background: rgba(26, 26, 46, 0.78);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
  opacity: 0.95;
  cursor: help;
}
</style>
