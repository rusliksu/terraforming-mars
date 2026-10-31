<template>
  <label :class="['select-party__card', {'select-party__card--on': card.selected, 'select-party__card--off': card.disabled}]"
    :style="{'--party': PARTY_COLOR[card.party.name]}" :data-test="'party-' + card.party.name">
    <input type="radio" class="choice-option-input" :name="groupName" :checked="card.selected" :disabled="card.disabled" @change="$emit('select')">
    <span class="select-party__badge"><span class="select-party__hex"><img :src="partyImage(card.party.name)" alt=""></span></span>
    <span class="select-party__name">{{ $t(card.party.name) }}</span>
    <span class="select-party__leader" :title="$t('Party leader')">
      <DelegateFigure v-if="card.party.partyLeader !== undefined" :color="card.party.partyLeader" :size="26" />
      <span v-else class="select-party__seat" style="background-image: url('assets/wrybit/figures/astronaut-neutral.png');"></span>
    </span>
    <span class="select-party__seats"><DelegateFigure v-for="(color, index) in seatedDelegates(card.party)" :key="index" :color="color" /></span>
    <span v-if="card.policyText !== undefined" class="select-party__rule select-party__rule--policy"><small>{{ $t('While ruling') }}</small>{{ $t(card.policyText) }}</span>
    <span v-if="card.bonusText !== undefined" class="select-party__rule select-party__rule--bonus"><small>{{ $t('When taking over') }}</small>{{ $t(card.bonusText) }}</span>
    <span class="select-party__marks">
      <span v-if="note !== undefined" class="select-party__ruling">{{ $t(note) }}</span>
      <span v-if="card.party.name === turmoil.ruling" class="select-party__ruling">{{ $t('Ruling') }}</span>
      <span v-if="card.party.name === turmoil.dominant" class="select-party__ruling select-party__ruling--successor" :title="$t('Dominant party: most delegates – takes over as the ruling party at the end of the generation')">{{ $t('Successor') }}</span>
    </span>
  </label>
</template>

<script setup lang="ts">
import type {PartyCardBinding} from './presentation';
import type {TurmoilModel} from '@/common/models/TurmoilModel';
import {PARTY_COLOR, partyImage, seatedDelegates} from './partyAppearance';
import DelegateFigure from './DelegateFigure.vue';

defineProps<{card: PartyCardBinding, turmoil: TurmoilModel, groupName: string, note?: string}>();
defineEmits<{select: []}>();
</script>
