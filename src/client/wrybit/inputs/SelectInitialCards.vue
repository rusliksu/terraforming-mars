<template>
  <div class="select-initial-cards">
    <div class="setup-columns">
      <section v-for="section in binding.sections" :key="section.key" :class="['setup-column', 'setup-column--' + section.key]">
        <header class="setup-column-head">
          <div class="setup-column-title-row">
            <h2 class="setup-column-title">{{ $t(shortTabLabel(section.title)) }}</h2>
            <span :class="['setup-column-count', {'setup-column-count--done': section.done}]">{{ section.badge }}</span>
          </div>
          <div class="setup-column-subtitle">{{ $t(section.title) }}</div>
        </header>
        <div class="setup-column-body">
          <PresentationHost :hosts="section.host"/>
          <div v-if="section.key === 'corporation' && binding.aridorColonies !== undefined" class="player_home_colony_cont">
            <div v-i18n>These are the colony tiles Aridor may choose from:</div>
            <div class="discarded-colonies-for-aridor">
              <div v-for="colony in binding.aridorColonies" :key="colony.name" class="player_home_colony small_colony">
                <Colony :colony="colony" :active="colony.isActive"/>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    <div class="select-initial-cards-footer">
      <SetupSummary :starting="binding.starting" :preludes="binding.preludes" :purchase="binding.purchase"
        :remaining="binding.remaining" :purchasedCount="binding.purchasedCount" :cardCost="binding.cardCost"
        :status="binding.warning ?? 'Ready to start'" :statusReady="binding.valid && binding.warning === undefined">
        <AppButton :disabled="!binding.valid" v-if="binding.showsave" @click="binding.save()" type="submit"
          :title="binding.playerinput.buttonLabel" class="select-initial-cards-start"/>
      </SetupSummary>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {InitialCardsBinding} from './presentation';
import {shortTabLabel} from './orOptionsShortLabels';
import PresentationHost from './PresentationHost.vue';
import SetupSummary from './SetupSummary.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import Colony from '@/client/components/colonies/Colony.vue';

defineProps<{binding: InitialCardsBinding}>();
</script>
