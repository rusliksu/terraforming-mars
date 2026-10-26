import type {TurmoilModel} from '@/common/models/TurmoilModel';
import {PartyName} from '@/common/turmoil/PartyName';
import type {Agenda} from '@/common/turmoil/Types';

export function partyAgenda(turmoil: TurmoilModel, party: PartyName): Agenda {
  const politicalAgendas = turmoil.politicalAgendas;
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
}
