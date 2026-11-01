<template>
  <div class="module-item-filter--embedded">
    <div class="corporations-filter-toolbox-cont">
      <div class="corporations-filter-toolbox corporations-filter-toolbox--topmost">
        <a href="#" v-i18n @click.prevent="binding.selectAll('All')">All*</a> |
        <a href="#" v-i18n @click.prevent="binding.selectNone('All')">None*</a> |
        <a href="#" v-i18n @click.prevent="binding.invertSelection('All')">Invert*</a>
        <input class="filter" :placeholder="$t('filter')" :value="binding.filterText" @input="binding.setFilter(($event.target as HTMLInputElement).value)">
      </div>
    </div>
    <div class="corporations-filter">
      <template v-for="group in binding.groups">
        <div class="corporations-filter-group" v-if="binding.showGroup(group.key)" :key="group.key">
          <div class="corporations-filter-toolbox-cont">
            <div>
              <span v-i18n>{{ group.label }}</span>&nbsp;
              <div :class="binding.icon(group.key)"></div>
            </div>
            <div class="corporations-filter-toolbox">
              <a href="#" v-i18n @click.prevent="binding.selectAll(group.key)">All</a> |
              <a href="#" v-i18n @click.prevent="binding.selectNone(group.key)">None</a> |
              <a href="#" v-i18n @click.prevent="binding.invertSelection(group.key)">Invert</a>
            </div>
          </div>
          <div v-for="item in binding.itemsByGroup[group.key]" :key="item" v-show="binding.include(item)">
            <label class="form-checkbox" :title="binding.itemTitle(item)">
              <input type="checkbox" :checked="binding.selected.includes(item)" :disabled="!binding.isSelectable(item)" @change="binding.toggle(item)">
              <i class="form-icon"></i>
              <slot name="item" :itemName="item" :icon="binding.icon"></slot>
            </label>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {ModuleFilterBinding} from './moduleFilter';
defineProps<{binding: ModuleFilterBinding}>();
</script>
