<template>
  <div :class="'filterDiv party-container party-background--' + partyNameToCss(party.name) + unavailablePartyClass">
    <div :class="'board-party board-party--' + partyNameToCss(party.name)">
      <div :class="dominantClass">
        <div class="send-delegate-leader-spot">
          <div v-if="party.partyLeader" :class="['player-token', party.partyLeader]"></div>
        </div>
      </div>
      <div class="grid-delegates grid-in-send-delegate">
        <div class="delegate-spot" v-for="n in 6" :key="n">
          <div v-if="party.delegates.length >= n" :class="'player-token '+party.delegates[n-1].color">
            <div class="count-in-send-delegate">{{ party.delegates[n-1].number }}</div>
          </div>
        </div>
      </div>
      <div :class="'selectable-party-name party-name party-name--'+partyNameToCss(party.name)" v-i18n>{{party.name}}</div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import Canonical from '@/client/components/Party.vue';

export default defineComponent({name: 'Party', extends: Canonical});
</script>
