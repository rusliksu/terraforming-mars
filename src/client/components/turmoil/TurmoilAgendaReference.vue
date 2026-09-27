<template>
  <div v-if="activeParty" class="agenda-reference">
    <div v-if="agendaStyle === 'Chairman'" class="agenda-reference-body">
      <div class="agenda-reference-parties">
        <button v-for="party in parties" :key="party.name" type="button"
          :aria-pressed="party.name === activeParty.name"
          @click="selectedParty = party.name">
          <span :class="'party-name party-name--' + party.name.toLowerCase().replaceAll(' ', '_')" v-i18n>{{ party.name }}</span>
        </button>
      </div>
      <p v-if="agendaStyle === 'Chairman' && !morePartiesExpansion" class="agenda-reference-hint" v-i18n>When you become chairman, choose either a bonus or a policy.</p>
      <p class="agenda-reference-hint" v-i18n>Current selections are marked. Change them through the game prompt.</p>
      <div class="agenda-reference-sections">
        <section v-for="section in sections" :key="section.title">
          <h3 v-i18n>{{ section.title }}</h3>
          <div class="agenda-reference-options" :class="{'agenda-reference-policies': section.policies}">
            <article v-for="id in section.ids" :key="id" :data-agenda-id="id"
              class="agenda-reference-option" :class="{'agenda-reference-current': id === section.current}">
              <div class="agenda-reference-label">
                <span><span v-i18n>{{ agendaInfoById(id).type }}</span> {{ Number(agendaInfoById(id).num) }}</span>
                <span v-if="id === section.current" class="agenda-reference-badge" v-i18n>Current selection</span>
              </div>
              <div class="agenda-reference-icon"><TurmoilAgenda :id="id" :morePartiesExpansion="morePartiesExpansion" /></div>
              <p v-i18n>{{ getAgendaOrThrow(id, morePartiesExpansion).description }}</p>
            </article>
          </div>
        </section>
      </div>
    </div>
    <div v-else class="agenda-reference-body agenda-reference-current-policies">
      <article v-for="party in parties" :key="party.name" :data-agenda-id="party.agenda.policyId" class="agenda-reference-option">
        <div :class="'party-name party-name--' + party.name.toLowerCase().replaceAll(' ', '_')" v-i18n>{{ party.name }}</div>
        <div class="agenda-reference-icon"><TurmoilAgenda :id="party.agenda.policyId" :morePartiesExpansion="morePartiesExpansion" /></div>
        <p v-i18n>{{ getAgendaOrThrow(party.agenda.policyId, morePartiesExpansion).description }}</p>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
import {PartyName} from '@/common/turmoil/PartyName';
import {Agenda, AgendaStyle, agendaInfoById} from '@/common/turmoil/Types';
import {getAgendaOrThrow, getPartyAgendaIds} from '@/client/turmoil/ClientAgendaManifest';
import TurmoilAgenda from '@/client/components/turmoil/TurmoilAgenda.vue';

const props = defineProps<{
  parties: ReadonlyArray<{name: PartyName; agenda: Agenda}>;
  rulingParty?: PartyName;
  agendaStyle: AgendaStyle;
  morePartiesExpansion: boolean;
}>();

const selectedParty = ref<PartyName>();
const activeParty = computed(() => props.parties.find((party) => party.name === selectedParty.value) ??
  props.parties.find((party) => party.name === props.rulingParty) ?? props.parties[0]);
const sections = computed(() => {
  const party = activeParty.value;
  if (party === undefined) {
    return [];
  }
  const ids = getPartyAgendaIds(party.name, props.morePartiesExpansion);
  return [
    {title: 'Available bonuses', ids: ids.bonuses, current: party.agenda.bonusId, policies: false},
    {title: 'Available policies', ids: ids.policies, current: party.agenda.policyId, policies: true},
  ];
});
</script>

<style scoped>
.agenda-reference {
  box-sizing: border-box;
  width: 100%;
  color: #e7ebee;
  background: #242a30;
  border: 1px solid #64717b;
  border-radius: 10px;
  text-align: left;
}

.agenda-reference-body {
  padding: 18px;
}

.agenda-reference-current-policies {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.agenda-reference-parties {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

button {
  padding: 3px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 5px;
  cursor: pointer;
}

button[aria-pressed="true"] {
  border-color: #efc765;
}

button:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}

.party-name {
  display: block;
  width: auto;
  min-width: 100px;
  margin: 0;
  padding: 0 12px;
  font-size: 13px;
}

.agenda-reference-hint {
  margin: 8px 0;
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.4;
}

.agenda-reference-sections {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 16px;
}

h3 {
  margin: 12px 0 8px;
  font-size: 16px;
}

.agenda-reference-options {
  display: grid;
  gap: 10px;
}

.agenda-reference-policies {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.agenda-reference-option {
  min-width: 0;
  padding: 10px;
  border: 1px solid #52606b;
  border-radius: 7px;
  background: #323b43;
}

.agenda-reference-current {
  border-color: #efc765;
  background: #413d2f;
}

.agenda-reference-label {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px;
  font-size: 12px;
}

.agenda-reference-badge {
  color: #ffdc85;
  font-weight: bold;
}

.agenda-reference-icon {
  display: grid;
  place-items: center;
  min-height: 62px;
}

.agenda-reference-option p {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

@media (max-width: 700px) {
  .agenda-reference-sections {
    grid-template-columns: minmax(0, 1fr);
  }

  .agenda-reference-options, .agenda-reference-current-policies {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 450px) {
  .agenda-reference-options, .agenda-reference-current-policies {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
