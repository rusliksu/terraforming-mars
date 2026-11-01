<template>
  <label :class="['player-option', 'player_translucent_bg_color_' + color, {'player-option--selected': selected}]" :title="caption === undefined ? undefined : $t(caption)">
    <input type="radio" :name="groupName" :value="color" :checked="selected" class="player-option-input" @change="$emit('select', color)">
    <SelectPlayerRow class="player-option-name" :player="player" />
    <div v-if="preview !== undefined" class="player-option-resource">
      <i :class="'resource_icon player-option-icon resource_icon--' + preview.resource"></i>
      <div class="player-option-values">
        <div class="player-option-value">
          <div class="player-option-label" v-i18n>Stock</div>
          {{ preview.before.stock }}<span v-if="preview.after.stock !== preview.before.stock" class="player-option-after">→{{ preview.after.stock }}</span>
        </div>
        <div class="player-option-value">
          <div class="player-option-label" v-i18n>Production</div>
          {{ signed(preview.before.production) }}<span v-if="preview.after.production !== preview.before.production" class="player-option-after">→{{ signed(preview.after.production) }}</span>
        </div>
      </div>
    </div>
  </label>
</template>

<script setup lang="ts">
import type {ColorWithNeutral} from '@/common/Color';
import type {PublicPlayerModel} from '@/common/models/PlayerModel';
import type {Message} from '@/common/logs/Message';
import type {Resource} from '@/common/Resource';
import SelectPlayerRow from '@/client/components/SelectPlayerRow.vue';

// Optional before/after values must be supplied by our owner; no title-to-effect inference.
defineProps<{color: ColorWithNeutral, player?: PublicPlayerModel, selected: boolean, groupName: string, caption?: string | Message,
  preview?: {resource: Resource, before: {stock: number, production: number}, after: {stock: number, production: number}}}>();
defineEmits<{select: [color: ColorWithNeutral]}>();
function signed(value: number): string {
  return value > 0 ? '+' + value : String(value);
}
</script>
