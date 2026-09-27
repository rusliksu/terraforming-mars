<template>
    <div class="turmoil" v-trim-whitespace>
      <div class="events-board">
        <GlobalEvent v-if="turmoil.distant" :globalEventName="turmoil.distant" type="distant" :showDistance="true"/>
        <GlobalEvent v-if="turmoil.coming" :globalEventName="turmoil.coming" type="coming" :showDistance="true"/>
        <GlobalEvent v-if="turmoil.current" :globalEventName="turmoil.current" type="current" :showDistance="true"/>
      </div>

      <div class="turmoil-board">
        <div class="turmoil-header">
          <div class="turmoil-lobby">
            <div class="lobby-spot" v-for="n in 5" :key="n">
                <div v-if="turmoil.lobby.length >= n" :class="'player-token '+turmoil.lobby[n-1]"></div>
            </div>
          </div>
          <div class="dominant-party-name">
            <div :class="'party-name party-name--'+partyNameToCss(turmoil.ruling)" v-i18n>{{ turmoil.ruling }}</div>
          </div>
          <div class="dominant-party-bonus">
            <TurmoilAgenda v-if="turmoil.ruling" :id="getPolicy(turmoil.ruling)" :morePartiesExpansion="morePartiesExpansion"/>
          </div>
          <div class="policy-user-cubes">
            <template v-for="n in turmoil.policyActionUsers" :key="n.color">
              <div v-if="n.turmoilPolicyActionUsed" :class="policyMarkerClasses(n.color)"></div>
              <div v-if="n.politicalAgendasActionUsedCount > 0" :class="policyMarkerClasses(n.color)">{{n.politicalAgendasActionUsedCount}}</div>
            </template>
          </div>
          <div class="chairman-spot"><div v-if="turmoil.chairman" :class="'player-token '+turmoil.chairman"></div></div>
          <div class="turmoil-reserve">
              <div class="lobby-spot" v-for="n in turmoil.reserve.length" :key="n">
                <div v-if="turmoil.reserve.length >= n" :class="'player-token '+turmoil.reserve[n-1].color">
                  <div class="count-in-send-delegate">{{ turmoil.reserve[n-1].number }}</div>
                </div>
              </div>
          </div>
          <div class="policies">
            <div class="policies-title">
                <a ref="policiesLink" class="policies-clickable" href="#" @click.prevent="toggleMe()" v-i18n>Policies</a>
            </div>
            <div v-if="!hasAgendas" v-show="isVisible()" class='policies-global'>
              <div v-for="party in turmoil.parties" :key="party.name" class='policy-block'>
                <div :class="'party-name party-name--'+partyNameToCss(party.name)" v-i18n>{{party.name}}</div>

                <div class="party-bonus">
                  <TurmoilAgenda :id="getPolicy(party.name)" :morePartiesExpansion="morePartiesExpansion"/>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-leaders">
          <div v-for="party in turmoil.parties" :key="party.name" :class="['leader-spot', 'leader-spot--'+partyNameToCss(party.name), {'player-token-new-leader': (party.name === turmoil.dominant)}]">
            <div class="delegate-spot">
              <div v-if="party.partyLeader" :class="['player-token', party.partyLeader]"></div>
            </div>
          </div>
        </div>

        <div class="grid-parties">
          <div v-for="party in turmoil.parties" :key="party.name" :class="'board-party board-party--'+partyNameToCss(party.name)">
            <div class="grid-delegates">
              <div class="delegate-spot" v-for="n in 6" :key="n">
                <div v-if="party.delegates.length >= n" :class="'player-token '+party.delegates[n-1].color">
                  <div class="count-in-send-delegate">{{ party.delegates[n-1].number }}</div>
                </div>
              </div>
            </div>
            <div :class="'party-name party-name--'+partyNameToCss(party.name)" v-i18n>{{party.name}}</div>
            <div class="party-bonus">
              <TurmoilAgenda type="party-bonus" :id="getBonus(party.name)" :morePartiesExpansion="morePartiesExpansion"/>
            </div>
          </div>
        </div>

        <div class="turmoil-party-transition-arrow-grid">
          <div class="turmoil-party-transition-arrow"></div>
          <div class="turmoil-party-transition-arrow"></div>
          <div class="turmoil-party-transition-arrow"></div>
          <div class="turmoil-party-transition-arrow"></div>
          <div class="turmoil-party-transition-arrow"></div>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <PopupPanel v-if="showReference" class="agenda-reference-popup" role="dialog" aria-labelledby="agenda-reference-title" @close="closeReference">
        <template #header>
          <h2 ref="referenceTitle" id="agenda-reference-title" tabindex="-1" v-i18n>{{ agendaStyle === 'Chairman' ? 'Party reference' : 'Policies' }}</h2>
        </template>
        <TurmoilAgendaReference :parties="referenceParties" :rulingParty="turmoil.ruling" :agendaStyle="agendaStyle" :morePartiesExpansion="morePartiesExpansion" />
      </PopupPanel>
    </Teleport>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {vueRoot} from '@/client/components/vueRoot';
import {Color, isReservedPlayerColor} from '@/common/Color';
import {PartyName} from '@/common/turmoil/PartyName';
import {TurmoilModel} from '@/common/models/TurmoilModel';
import TurmoilAgenda from '@/client/components/turmoil/TurmoilAgenda.vue';
import TurmoilAgendaReference from '@/client/components/turmoil/TurmoilAgendaReference.vue';
import PopupPanel from '@/client/components/common/PopupPanel.vue';
import GlobalEvent from '@/client/components/turmoil/GlobalEvent.vue';
import {Agenda, AgendaStyle, BonusId, PolicyId} from '@/common/turmoil/Types';

export default defineComponent({
  name: 'Turmoil',
  props: {
    turmoil: {
      type: Object as () => TurmoilModel,
      required: true,
    },
    morePartiesExpansion: {
      type: Boolean,
      default: false,
    },
    agendaStyle: {
      type: String as () => AgendaStyle,
      default: 'Standard',
    },
  },
  data() {
    return {showReference: false};
  },
  computed: {
    hasAgendas(): boolean {
      return this.agendaStyle !== 'Standard' || this.morePartiesExpansion;
    },
    referenceParties(): Array<{name: PartyName; agenda: Agenda}> {
      return this.turmoil.parties.map((party) => ({name: party.name, agenda: this.agendaFor(party.name)}));
    },
  },
  methods: {
    partyNameToCss(party: PartyName | undefined): string {
      if (party === undefined) {
        console.warn('no party provided');
        return '';
      }
      return party.toLowerCase().split(' ').join('_');
    },
    policyMarkerClasses(color: Color): Array<string> {
      const classes = ['policy-use-marker', `board-cube--${color}`];
      if (isReservedPlayerColor(color)) {
        classes.push('board-cube--persona');
      }
      return classes;
    },
    // politicalAgendas only has an entry for parties actually in play this game (More Parties
    // games randomly select 6 of the 12 available -- see Turmoil.createParties). getBonus and
    // getPolicy are only ever called with a party.name from turmoil.parties, so the entry
    // always exists in practice; agendaFor throws a clear error otherwise instead of silently
    // reading `undefined`.
    agendaFor(party: PartyName): Agenda {
      const politicalAgendas = this.turmoil.politicalAgendas;
      if (politicalAgendas === undefined) {
        throw new Error('Political agendas not defined');
      }
      const agenda = (() => {
        switch (party) {
        case PartyName.MARS: return politicalAgendas.marsFirst;
        case PartyName.SCIENTISTS: return politicalAgendas.scientists;
        case PartyName.UNITY: return politicalAgendas.unity;
        case PartyName.KELVINISTS: return politicalAgendas.kelvinists;
        case PartyName.REDS: return politicalAgendas.reds;
        case PartyName.GREENS: return politicalAgendas.greens;
        case PartyName.POPULISTS: return politicalAgendas.populists;
        case PartyName.SPOME: return politicalAgendas.spome;
        case PartyName.EMPOWER: return politicalAgendas.empower;
        case PartyName.BUREAUCRATS: return politicalAgendas.bureaucrats;
        case PartyName.CENTRISTS: return politicalAgendas.centrists;
        case PartyName.TRANSHUMANISTS: return politicalAgendas.transhumanists;
        default: throw new Error(`Unknown party name ${party}`);
        }
      })();
      if (agenda === undefined) {
        throw new Error(`No agenda in play for party ${party}`);
      }
      return agenda;
    },
    getBonus(party: PartyName): BonusId {
      return this.agendaFor(party).bonusId;
    },
    getPolicy(partyName: PartyName): PolicyId {
      return this.agendaFor(partyName).policyId;
    },
    async toggleMe() {
      if (this.hasAgendas) {
        this.showReference = true;
        await this.$nextTick();
        const title = this.$refs.referenceTitle;
        if (title instanceof HTMLElement) {
          title.focus();
        }
        return;
      }
      const currentState: boolean = this.isVisible();
      vueRoot(this).setVisibilityState('turmoil_parties', ! currentState);
    },
    isVisible() {
      return vueRoot(this).getVisibilityState('turmoil_parties');
    },
    closeReference() {
      this.showReference = false;
      const link = this.$refs.policiesLink;
      if (link instanceof HTMLElement) {
        link.focus();
      }
    },
  },
  components: {
    GlobalEvent,
    TurmoilAgenda,
    TurmoilAgendaReference,
    PopupPanel,
  },
});

</script>

<style scoped>
.agenda-reference-popup :deep(.popup-inner) {
  box-sizing: border-box;
  width: min(960px, calc(100vw - 32px));
  height: auto;
  max-height: 90vh;
  padding: 16px;
}

.agenda-reference-popup :deep(.popup-header) {
  margin: 0 0 16px;
  gap: 12px;
}

.agenda-reference-popup :deep(.close-button) {
  position: static;
}

#agenda-reference-title {
  margin: 0;
  font-size: 20px;
}
</style>
