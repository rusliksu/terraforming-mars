<template>
  <div class="turmoil-board-tab">
    <!-- Turmoil board tab: ruling policy on top, the committee as a hemicycle (parties, seats, leaders, chair, dominance),
         lobby and reserve in the free corners, the neutral delegates explained, the global events in time order -->
    <div v-if="turmoil.ruling !== undefined" class="turmoil-board-tab__policy">
      <span class="turmoil-board-tab__ruling-party">
        <img :src="partyImage(turmoil.ruling)" alt="">
        <span><small>{{ $t('Ruling') }}</small><b>{{ $t(turmoil.ruling) }}</b></span>
      </span>
      <span class="turmoil-board-tab__policy-text">{{ $t(details(turmoil.ruling).policyText ?? '') }}</span>
      <span v-if="viewer !== undefined" class="turmoil-board-tab__influence">{{ $t('Influence') }} <b>{{ viewer.influence }}</b></span>
    </div>

    <div class="turmoil-board-tab__hemicycle">
      <svg :viewBox="'0 0 ' + HEMICYCLE_WIDTH + ' ' + HEMICYCLE_HEIGHT" class="turmoil-board-tab__svg" role="group">
        <defs>
          <radialGradient v-for="party in turmoil.parties" :key="party.name" :id="gradientId(party.name)"
            :cx="CHAIR_CENTER.x" :cy="CHAIR_CENTER.y" :r="GRADIENT_RADIUS" gradientUnits="userSpaceOnUse">
            <stop offset="0.25" :stop-color="PARTY_COLOR[party.name]" stop-opacity=".5"/>
            <stop offset="1" :stop-color="PARTY_COLOR[party.name]" stop-opacity=".95"/>
          </radialGradient>
        </defs>
        <g v-for="(party, index) in turmoil.parties" :key="party.name" class="turmoil-board-tab__party" :data-test="'committee-' + party.name">
          <title>{{ $t(party.name) }}</title>
          <path :d="wedges[index].path" :fill="'url(#' + gradientId(party.name) + ')'" class="turmoil-board-tab__wedge"/>
          <template v-for="(seat, seatIndex) in wedges[index].seats" :key="seatIndex">
            <foreignObject v-if="seated(party)[seatIndex] !== undefined" :x="seat.x - 20" :y="seat.y - 26" width="40" height="54">
              <DelegateFigure :color="seated(party)[seatIndex]" :size="40"/>
            </foreignObject>
            <image v-else :href="'assets/wrybit/figures/astronaut-neutral.png'" :x="seat.x - 17" :y="seat.y - 22" width="34" :height="34 * FIGURE_RATIO" class="turmoil-board-tab__seat-empty"/>
          </template>
          <g :transform="'translate(' + wedges[index].leader.x + ' ' + wedges[index].leader.y + ') rotate(' + (wedges[index].middle - 90) + ')'">
            <rect x="-30" y="-25" width="60" height="50" rx="8" class="turmoil-board-tab__leader-seat"/>
          </g>
          <foreignObject v-if="party.partyLeader !== undefined" :x="wedges[index].leader.x - 23" :y="wedges[index].leader.y - 27" width="46" height="60">
            <DelegateFigure :color="party.partyLeader" :size="46"/>
          </foreignObject>
          <image :href="partyImage(party.name)" :x="wedges[index].icon.x - 44" :y="wedges[index].icon.y - 32" width="88" height="64" class="turmoil-board-tab__party-icon"/>
          <g v-if="party.name === turmoil.ruling" class="turmoil-board-tab__ruling-badge">
            <rect :x="wedges[index].icon.x - 48" :y="wedges[index].icon.y + 30" width="96" height="22" rx="5"/>
            <text :x="wedges[index].icon.x" :y="wedges[index].icon.y + 46">{{ $t('Ruling') }}</text>
          </g>
          <!-- Successor (dominant party) as a white badge under the party icon like "Ruling" – below it if the party is both -->
          <g v-if="party.name === turmoil.dominant" class="turmoil-board-tab__ruling-badge turmoil-board-tab__ruling-badge--successor"
            :transform="party.name === turmoil.ruling ? 'translate(0 26)' : undefined">
            <title>{{ $t('Dominant party: most delegates – takes over as the ruling party at the end of the generation') }}</title>
            <rect :x="wedges[index].icon.x - 70" :y="wedges[index].icon.y + 30" width="140" height="22" rx="5"/>
            <text :x="wedges[index].icon.x" :y="wedges[index].icon.y + 46">{{ $t('Successor') }}</text>
          </g>
        </g>
        <path :d="chairPath" class="turmoil-board-tab__chair"/>
        <!-- Heading at the top of the dark chair, the chairman below it -->
        <g class="turmoil-board-tab__chair-label">
          <text :x="CHAIR_CENTER.x" :y="CHAIR_CENTER.y + 28">{{ $t('Chairman') }}</text>
        </g>
        <!-- Chairman on a seat like the party leaders (same dark seat with outline, same figure size) -->
        <rect :x="CHAIR_CENTER.x - 30" :y="CHAIR_CENTER.y + CHAIR_SEAT_OFFSET - 25" width="60" height="50" rx="8" class="turmoil-board-tab__leader-seat"/>
        <foreignObject v-if="turmoil.chairman !== undefined" :x="CHAIR_CENTER.x - 23" :y="CHAIR_CENTER.y + CHAIR_SEAT_OFFSET - 27" width="46" height="60">
          <DelegateFigure :color="turmoil.chairman" :size="46"/>
        </foreignObject>

      </svg>
      <div class="turmoil-board-tab__corner turmoil-board-tab__corner--left">
        <b>{{ $t('Lobby') }}</b>
        <span class="turmoil-board-tab__figures">
          <DelegateFigure v-for="(color, index) in turmoil.lobby" :key="index" :color="color" :size="22"/>
        </span>
        <small>{{ $t('free · 1×/gen.') }}</small>
      </div>
      <div class="turmoil-board-tab__corner turmoil-board-tab__corner--right">
        <b>{{ $t('Reserve') }}</b>
        <span v-for="entry in turmoil.reserve.filter(item => item.color !== 'neutral')" :key="entry.color"
          class="turmoil-board-tab__figures" :data-test="'reserve-' + entry.color">
          <DelegateFigure :color="entry.color" :size="18"/><b>{{ entry.number }}</b>
        </span>
      </div>
    </div>

    <div class="turmoil-board-tab__neutral" data-test="neutral-reserve">
      <DelegateFigure color="neutral"/><p>{{ $t('Neutral delegates') }}</p><small>{{ neutralReserve }}</small>
    </div>
    <div v-if="overflow.length > 0" class="turmoil-board-tab__overflow">
      <div v-for="entry in overflow" :key="entry.party" :data-test="'overflow-' + entry.party">
        <b>{{ $t(entry.party) }} · {{ $t('Additional delegates') }}</b>
        <span v-for="delegate in entry.delegates" :key="delegate.color" :data-color="delegate.color" :title="delegate.color"
          :aria-label="delegate.color + ': +' + delegate.number">
          <DelegateFigure :color="delegate.color"/>+{{ delegate.number }}
        </span>
      </div>
    </div>
    <div class="turmoil-board-tab__policy-users">
      <span v-for="user in turmoil.policyActionUsers.filter(item => item.turmoilPolicyActionUsed || item.politicalAgendasActionUsedCount > 0)"
        :key="user.color" :data-test="'policy-user-' + user.color">
        <DelegateFigure :color="user.color"/>{{ $t('Policy used') }}: {{ user.turmoilPolicyActionUsed ? '✓' : '—' }}
        · {{ $t('Agenda actions') }}: {{ user.politicalAgendasActionUsedCount }}
      </span>
    </div>
    <details class="turmoil-board-tab__reference"><summary>{{ $t('Policies') }}</summary>
      <div v-for="party in turmoil.parties" :key="party.name">
        <b>{{ $t(party.name) }}</b><p>{{ $t(details(party.name).policyText ?? '') }}</p>
        <small>{{ $t(details(party.name).bonusText ?? '') }}</small>
      </div>
    </details>
    <!-- Events in time order: a row below in a tall box, a column on the right in a wide one (container query) -->
    <div class="turmoil-board-tab__events">
      <template v-for="(slot, index) in eventSlots" :key="slot.type">
        <span v-if="index > 0" class="turmoil-board-tab__event-arrow" aria-hidden="true">›</span>
        <TurmoilEventCard :name="slot.name" :type="slot.type" :generation="generation + slot.offset" :label="slot.label"/>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, useId} from 'vue';
import type {TurmoilModel, PartyModel, DelegatesModel} from '@/common/models/TurmoilModel';
import type {PublicPlayerModel} from '@/common/models/PlayerModel';
import type {PartyName} from '@/common/turmoil/PartyName';
import {partyCardDetails} from '@/client/components/turmoil/partyCardDetails';
import {PARTY_COLOR, partyImage, seatedDelegates as seated} from '@/client/wrybit/inputs/partyAppearance';
import DelegateFigure from '@/client/wrybit/inputs/DelegateFigure.vue';
import TurmoilEventCard from './TurmoilEventCard.vue';
import {CHAIR_CENTER, FIGURE_RATIO, GRADIENT_RADIUS, HEMICYCLE_HEIGHT, HEMICYCLE_WIDTH, chairPath as makeChairPath, wedge} from './turmoilHemicycle';

const props = defineProps<{turmoil: TurmoilModel, viewer?: PublicPlayerModel, generation: number, moreParties: boolean}>();
const CHAIR_SEAT_OFFSET = 72;
const prefix = useId();
const chairPath = makeChairPath();
const wedges = computed(() => props.turmoil.parties.map((_, index) => wedge(index, props.turmoil.parties.length)));
// Native parties can outgrow the source drawing. Account for every figure not shown in a seat.
const overflow = computed(() => props.turmoil.parties.flatMap((party, index) => {
  const remaining = seated(party).slice(wedges.value[index].seats.length);
  const counts = new Map<DelegatesModel['color'], number>();
  for (const color of remaining) {
    counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  return remaining.length === 0 ? [] : [{party: party.name, delegates: [...counts].map(([color, number]) => ({color, number}))}];
}));
const neutralReserve = computed(() => props.turmoil.reserve.find((entry) => entry.color === 'neutral')?.number);
const eventSlots = computed(() => [
  {type: 'current' as const, name: props.turmoil.current, offset: 0, label: 'This generation'},
  {type: 'coming' as const, name: props.turmoil.coming, offset: 1, label: 'Next generation'},
  {type: 'distant' as const, name: props.turmoil.distant, offset: 2, label: 'In 2 generations'},
].flatMap((slot) => slot.name === undefined ? [] : [{...slot, name: slot.name}]));
function gradientId(party: PartyName): string {
  return prefix + '-' + party.replaceAll(' ', '-');
}
function details(name: PartyName) {
  const party: PartyModel = props.turmoil.parties.find((item) => item.name === name) ?? {name, partyLeader: undefined, delegates: []};
  return partyCardDetails(props.turmoil, party, props.moreParties);
}
</script>
