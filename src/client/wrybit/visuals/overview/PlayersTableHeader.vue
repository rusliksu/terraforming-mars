<template>
  <!-- Controls for the player table: the game menu and the section toggles. The header row with the
       column icons is gone: every player row carries its own resource, tag and score icons. -->
  <div class="players-table-controls">
    <GameMenu />
    <button v-for="section in sections" :key="section.key" type="button"
      :class="['players-table-toggle', {'players-table-toggle--squeezed': autoHidden.includes(section.key)}]"
      :aria-pressed="visibility[section.key] ? 'true' : 'false'"
      :aria-label="$t(section.label)"
      v-glass-tooltip="$t(section.label)"
      :data-test="'toggle-' + section.key"
      @click="$emit('toggle', section.key)">
      <span :class="['players-table-toggle-icon', 'players-table-toggle-icon--' + section.icon]"></span>
    </button>
  </div>
</template>

<script lang="ts">
import {glassTooltip} from '@/client/wrybit/visuals/common/GlassTooltip';
import {defineComponent} from 'vue';
import GameMenu from '@/client/wrybit/visuals/gameMenu/GameMenu.vue';
import {SectionVisibility, TableSection} from '@/client/wrybit/visuals/overview/playersTableLayout';

type SectionToggle = {key: TableSection; label: string; icon: 'megacredit' | 'building' | 'vp'};

// Icon per toggle: typical symbol of the section
const SECTION_TOGGLES: Array<SectionToggle> = [
  {key: 'goods', label: 'Goods', icon: 'megacredit'},
  {key: 'tags', label: 'Tags', icon: 'building'},
  {key: 'score', label: 'Scoring', icon: 'vp'},
];

export default defineComponent({
  name: 'PlayersTableHeader',
  components: {
    GameMenu,
  },
  directives: {
    glassTooltip,
  },
  props: {
    visibility: {
      type: Object as () => SectionVisibility,
      required: true,
    },
    // Sections hidden for lack of space: toggle dashed, a click brings them back
    autoHidden: {
      type: Array as () => Array<TableSection>,
      default: () => [],
    },
  },
  emits: ['toggle'],
  data() {
    return {sections: SECTION_TOGGLES};
  },
});
</script>
