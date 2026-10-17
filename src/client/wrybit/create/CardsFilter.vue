<template>
    <div class="cards-filter">
        <div class="create-game-card-head">
            <h2 v-i18n>{{ binding.title }}</h2>
            <span v-if="binding.selected.length" class="create-game-count">{{ binding.selected.length }}</span>
        </div>
        <div class="cards-filter-input">
            <PresentationHost :hosts="binding.inputHost"/>
            <!-- Matches as cards in one row; click or Enter adds, arrow keys move the highlight -->
            <CardPreviewGrid v-if="binding.searchMatches.length" class="cards-filter-suggest" :names="binding.searchMatches" row selectable
                :activeName="binding.activeCard" @hover="binding.highlight($event)" @select="binding.add"/>
        </div>
        <CardPreviewGrid v-if="binding.selected.length" class="cards-filter-selected" :names="binding.selected" removable @remove="binding.remove"/>
    </div>
</template>

<script setup lang="ts">
import type {CardsFilterBinding} from './cardsFilter';
import CardPreviewGrid from './CardPreviewGrid.vue';
import PresentationHost from '@/client/wrybit/inputs/PresentationHost.vue';
defineProps<{binding: CardsFilterBinding}>();
</script>
