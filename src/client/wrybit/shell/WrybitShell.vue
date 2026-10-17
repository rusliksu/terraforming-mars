<template>
  <AppBackground v-if="hasBackground" :always="screen === 'start-screen'" :show-credit="screen === 'start-screen'" />
  <aside v-if="screen !== 'cards'" class="wrybit-mode-switch" :data-screen="screen" data-wrybit-shell>
    <button type="button" class="btn" @click="$emit('classic')" v-i18n>Classic layout</button>
  </aside>
</template>

<script setup lang="ts">
import {computed, markRaw, onMounted} from 'vue';
import AppBackground from '@/client/wrybit/shell/AppBackground.vue';
import Catalog from '@/client/wrybit/visuals/cardlist/CardList.vue';
import PlayerHome from '@/client/wrybit/visuals/PlayerHome.vue';
import PaymentForm from '@/client/wrybit/inputs/PaymentForm.vue';
import SelectProjectCardToPlay from '@/client/wrybit/inputs/SelectProjectCardToPlay.vue';
import OrOptions from '@/client/wrybit/inputs/OrOptions.vue';
import AndOptions from '@/client/wrybit/inputs/AndOptions.vue';
import SelectCard from '@/client/wrybit/inputs/SelectCard.vue';
import SelectAmount from '@/client/wrybit/inputs/SelectAmount.vue';
import SelectOption from '@/client/wrybit/inputs/SelectOption.vue';
import SelectDelegate from '@/client/wrybit/inputs/SelectDelegate.vue';
import SelectResource from '@/client/wrybit/inputs/SelectResource.vue';
import SelectResources from '@/client/wrybit/inputs/SelectResources.vue';
import SelectProductionToLose from '@/client/wrybit/inputs/SelectProductionToLose.vue';
import SelectPlayer from '@/client/wrybit/inputs/SelectPlayer.vue';
import SelectGlobalEvent from '@/client/wrybit/inputs/SelectGlobalEvent.vue';
import SelectClaimedUndergroundToken from '@/client/wrybit/inputs/SelectClaimedUndergroundToken.vue';
import DeltaProjectInput from '@/client/wrybit/inputs/DeltaProjectInput.vue';
import SelectSpace from '@/client/wrybit/inputs/SelectSpace.vue';
import ShiftAresGlobalParameters from '@/client/wrybit/inputs/ShiftAresGlobalParameters.vue';
import SelectInitialCards from '@/client/wrybit/inputs/SelectInitialCards.vue';
import SelectParty from '@/client/wrybit/inputs/SelectParty.vue';
import SelectColony from '@/client/wrybit/inputs/SelectColony.vue';
import CreateGameForm from '@/client/wrybit/create/CreateGameForm.vue';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import SeatIcon from '@/client/wrybit/visuals/common/SeatIcon.vue';
import NumberStepper from '@/client/wrybit/create/NumberStepper.vue';
import SwitchInput from '@/client/wrybit/create/SwitchInput.vue';
import ModuleItemFilter from '@/client/wrybit/create/ModuleItemFilter.vue';
import CardsFilter from '@/client/wrybit/create/CardsFilter.vue';
import type {WrybitViews} from './presentationViews';

const props = defineProps<{screen: string}>();
const emit = defineEmits<{classic: []; views: [views: WrybitViews]}>();
onMounted(() => emit('views', {cards: markRaw(Catalog), playerHome: markRaw(PlayerHome), create: markRaw(CreateGameForm),
  createControls: {cube: markRaw(PlayerCube), seat: markRaw(SeatIcon), stepper: markRaw(NumberStepper), toggle: markRaw(SwitchInput), moduleFilter: markRaw(ModuleItemFilter), cardsFilter: markRaw(CardsFilter)}, inputs: {
    paymentForm: markRaw(PaymentForm), projectCard: markRaw(SelectProjectCardToPlay),
    or: markRaw(OrOptions), and: markRaw(AndOptions),
    card: markRaw(SelectCard),
    amount: markRaw(SelectAmount), option: markRaw(SelectOption), delegate: markRaw(SelectDelegate),
    resource: markRaw(SelectResource), resources: markRaw(SelectResources), productionToLose: markRaw(SelectProductionToLose),
    player: markRaw(SelectPlayer), globalEvent: markRaw(SelectGlobalEvent), claimedUndergroundToken: markRaw(SelectClaimedUndergroundToken),
    deltaProject: markRaw(DeltaProjectInput),
    space: markRaw(SelectSpace), aresGlobalParameters: markRaw(ShiftAresGlobalParameters),
    initialCards: markRaw(SelectInitialCards),
    party: markRaw(SelectParty),
    colony: markRaw(SelectColony),
  }}));

const hasBackground = computed(() => [
  'start-screen', 'create-game-form', 'game-home', 'player-home', 'spectator-home',
  'the-end', 'games-overview', 'cards', 'load',
].includes(props.screen));
</script>

<style scoped>
.wrybit-mode-switch {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 201;
}
</style>

<style lang="less" src="./background.less"></style>
