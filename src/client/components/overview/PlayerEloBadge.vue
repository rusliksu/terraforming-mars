<template>
  <span
    v-if="eloText"
    class="player-elo-badge"
    :class="[tooltipCss, personaClass]"
    :data-tooltip="eloTooltip"
    :style="badgeStyle"
  >{{ eloText }}</span>
</template>

<script lang="ts">
import {defineComponent} from '@/client/vue3-compat';
import {EloEntry, ensureEloLoaded, fallbackEloEntry, lookupEloEntry, sharedEloState} from '@/client/utils/elo';
import {getPlayerIdentityByName} from '@/common/Color';

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
      if (this.eloEntry) {
        return this.eloEntry;
      }
      if (!sharedEloState.loaded && !sharedEloState.failed) {
        return null;
      }
      return fallbackEloEntry(this.playerName);
    },
    eloText(): string {
      const elo = this.effectiveEloEntry?.elo;
      return typeof elo === 'number' ? String(elo) : '';
    },
    eloTooltip(): string {
      const entry = this.effectiveEloEntry;
      if (!entry || typeof entry.elo !== 'number') {
        return '';
      }

      let text = 'Elo: ' + entry.elo;
      if (typeof entry.games === 'number') {
        text += ' | Games: ' + entry.games;
      }
      if (typeof entry.games === 'number' && entry.games > 0 && typeof entry.avgPlaceScore === 'number') {
        text += ' | Avg place: ' + entry.avgPlaceScore.toFixed(2);
      }
      if (typeof entry.games === 'number' && entry.games > 0 && typeof entry.totalVP === 'number') {
        text += ' | Avg VP: ' + Math.round(entry.totalVP / entry.games);
      }
      return text;
    },
    badgeStyle(): Record<string, string> {
      if (this.personaClass !== '') {
        return {};
      }
      const elo = this.effectiveEloEntry?.elo ?? 0;
      let color = '#f44336';
      if (elo >= 1550) {
        color = '#4caf50';
      } else if (elo >= 1450) {
        color = '#ffc107';
      }

      return {
        color,
        borderColor: color,
      };
    },
    personaClass(): string {
      const identity = getPlayerIdentityByName(this.playerName);
      return identity ? 'player-elo-badge--' + identity.color : '';
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

.player-elo-badge--gold {
  color: #ffe47a;
  border-color: #ffe47a;
  background: rgba(26, 26, 46, 0.78);
  box-shadow: 0 0 7px rgba(255, 215, 0, 0.42);
}

.player-elo-badge--emerald {
  color: #d7fff0;
  border-color: #61ffc8;
  background: rgba(26, 26, 46, 0.78);
  box-shadow: 0 0 7px rgba(0, 255, 170, 0.32);
}

.player-elo-badge--ginger {
  color: #ffe1c8;
  border-color: #ff9a54;
  background: rgba(26, 26, 46, 0.78);
  box-shadow: 0 0 7px rgba(255, 103, 26, 0.35);
}

.player-elo-badge--hydro {
  color: #f6e7ff;
  border-color: #9b68df;
  background: rgba(26, 26, 46, 0.78);
  box-shadow: 0 0 7px rgba(116, 67, 190, 0.42);
}

.player-elo-badge--pearl {
  color: #f2f8f8;
  border-color: #ffffff;
  background: rgba(28, 34, 42, 0.78);
  box-shadow: 0 0 7px rgba(242, 248, 248, 0.34);
}

.player-elo-badge--turquoise {
  color: #fff2f5;
  border-color: #ff9aae;
  background: rgba(46, 18, 28, 0.78);
  box-shadow: 0 0 7px rgba(224, 54, 105, 0.42);
}

.player-elo-badge--vanger {
  color: #b8ffb8;
  border-color: #00ff00;
  background: rgba(0, 32, 0, 0.78);
  box-shadow: 0 0 7px rgba(0, 255, 0, 0.42);
}

.player-elo-badge--saturnstorm {
  color: #ffe5e8;
  border-color: #ff8fa8;
  background: rgba(46, 18, 28, 0.78);
  box-shadow: 0 0 7px rgba(190, 31, 72, 0.42);
}
</style>
