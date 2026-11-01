import type {PartyModel, TurmoilModel} from '@/common/models/TurmoilModel';
import {partyAgenda} from './partyAgenda';
import {getAgenda} from '@/client/turmoil/ClientAgendaManifest';

export type PartyCardDetails = {party: PartyModel, policyText: string | undefined, bonusText: string | undefined};

/** Shared read-only projection of our current political agenda. */
export function partyCardDetails(turmoil: TurmoilModel, party: PartyModel, moreParties: boolean, betterMars: boolean): PartyCardDetails {
  const agenda = turmoil.politicalAgendas === undefined ? undefined : partyAgenda(turmoil, party.name);
  return {party, policyText: agenda === undefined ? undefined : getAgenda(agenda.policyId, moreParties, betterMars)?.description,
    bonusText: agenda === undefined ? undefined : getAgenda(agenda.bonusId, moreParties, betterMars)?.description};
}
