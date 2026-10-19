import {BonusId, PolicyId, BONUS_IDS, POLICY_IDS} from '@/common/turmoil/Types';
import {PartyName} from '@/common/turmoil/PartyName';
import {ClientAgenda} from '@/common/turmoil/ClientAgenda';
// @ts-ignore agendas.json doesn't exist during npm run build
import agendaJson from '@/genfiles/agendas.json';
// @ts-ignore agendas-more-parties.json doesn't exist during npm run build
import moreAgendaJson from '@/genfiles/agendas-more-parties.json';

const agendas = agendaJson as Partial<Record<BonusId | PolicyId, ClientAgenda>>;
const moreAgendas = moreAgendaJson as Partial<Record<BonusId | PolicyId, ClientAgenda>>;

export function getAgenda(id: BonusId | PolicyId, morePartiesExpansion: boolean = false): ClientAgenda | undefined {
  const source = morePartiesExpansion ? moreAgendas : agendas;
  return source[id];
}

export function getAgendaOrThrow(id: BonusId | PolicyId, morePartiesExpansion: boolean = false): ClientAgenda {
  const agenda = getAgenda(id, morePartiesExpansion);
  if (agenda === undefined) {
    throw new Error(`agenda ${id} not found`);
  }
  return agenda;
}

export function getPartyAgendaIds(partyName: PartyName, morePartiesExpansion: boolean = false): {bonuses: Array<BonusId>; policies: Array<PolicyId>} {
  const source = morePartiesExpansion ? moreAgendas : agendas;
  return {
    bonuses: BONUS_IDS.filter((id) => source[id]?.partyName === partyName),
    policies: POLICY_IDS.filter((id) => source[id]?.partyName === partyName),
  };
}
