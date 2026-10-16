import {PartyName} from '@/common/turmoil/PartyName';
import type {Color} from '@/common/Color';
import type {PartyModel} from '@/common/models/TurmoilModel';

// Source committee colours; our six additional parties retain our native palette.
export const PARTY_COLOR: Record<PartyName, string> = {
  [PartyName.MARS]: '#b0703a', [PartyName.SCIENTISTS]: '#bdbdb8', [PartyName.UNITY]: '#3d74b8',
  [PartyName.GREENS]: '#4e9a3c', [PartyName.REDS]: '#c2412f', [PartyName.KELVINISTS]: '#6c6366',
  [PartyName.POPULISTS]: '#d6249f', [PartyName.SPOME]: '#a4d90c', [PartyName.EMPOWER]: '#8e44ad',
  [PartyName.BUREAUCRATS]: '#c4c4c4', [PartyName.CENTRISTS]: '#f1c40f', [PartyName.TRANSHUMANISTS]: '#17c9d1',
};
export function partyImage(party: PartyName): string {
  return 'assets/parties/' + party.toLowerCase().replaceAll(' ', '-') + '.png';
}
export function seatedDelegates(party: PartyModel): Array<Color> {
  const delegates = party.delegates.flatMap((delegate) => Array.from({length: delegate.number}, () => delegate.color));
  const leader = party.partyLeader === undefined ? -1 : delegates.indexOf(party.partyLeader);
  if (leader >= 0) {
    delegates.splice(leader, 1);
  }
  return delegates;
}
