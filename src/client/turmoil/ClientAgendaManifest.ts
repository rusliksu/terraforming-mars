import {BonusId, PolicyId, BONUS_IDS, POLICY_IDS} from '@/common/turmoil/Types';
import {PartyName} from '@/common/turmoil/PartyName';
import {ClientAgenda} from '@/common/turmoil/ClientAgenda';
// @ts-ignore agendas.json doesn't exist during npm run build
import agendaJson from '@/genfiles/agendas.json';
// @ts-ignore agendas-more-parties.json doesn't exist during npm run build
import moreAgendaJson from '@/genfiles/agendas-more-parties.json';
// @ts-ignore agendas-better-mars.json doesn't exist during npm run build
import betterMarsAgendaJson from '@/genfiles/agendas-better-mars.json';

const agendas = agendaJson as Partial<Record<BonusId | PolicyId, ClientAgenda>>;
const moreAgendas = moreAgendaJson as Partial<Record<BonusId | PolicyId, ClientAgenda>>;
const betterMarsAgendas = betterMarsAgendaJson as Partial<Record<BonusId | PolicyId, ClientAgenda>>;

function agendaSource(morePartiesExpansion: boolean, betterMarsExpansion: boolean): Partial<Record<BonusId | PolicyId, ClientAgenda>> {
  if (morePartiesExpansion) {
    return moreAgendas;
  }
  return betterMarsExpansion ? betterMarsAgendas : agendas;
}

export function getAgenda(id: BonusId | PolicyId, morePartiesExpansion: boolean = false, betterMarsExpansion: boolean = false): ClientAgenda | undefined {
  return agendaSource(morePartiesExpansion, betterMarsExpansion)[id];
}

export function getAgendaOrThrow(id: BonusId | PolicyId, morePartiesExpansion: boolean = false, betterMarsExpansion: boolean = false): ClientAgenda {
  const agenda = getAgenda(id, morePartiesExpansion, betterMarsExpansion);
  if (agenda === undefined) {
    throw new Error(`agenda ${id} not found`);
  }
  return agenda;
}

export function getPartyAgendaIds(partyName: PartyName, morePartiesExpansion: boolean = false, betterMarsExpansion: boolean = false): {bonuses: Array<BonusId>; policies: Array<PolicyId>} {
  const source = agendaSource(morePartiesExpansion, betterMarsExpansion);
  return {
    bonuses: BONUS_IDS.filter((id) => source[id]?.partyName === partyName),
    policies: POLICY_IDS.filter((id) => source[id]?.partyName === partyName),
  };
}
