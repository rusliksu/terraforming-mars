import {BonusId, PolicyId, agendaInfoById} from '@/common/turmoil/Types';
import {PartyName} from '@/common/turmoil/PartyName';
import {GameModule} from '@/common/cards/GameModule';

const NEW_PARTIES: ReadonlySet<PartyName> = new Set([
  PartyName.POPULISTS, PartyName.SPOME, PartyName.EMPOWER,
  PartyName.BUREAUCRATS, PartyName.CENTRISTS, PartyName.TRANSHUMANISTS,
]);

/** Expansion required to list a public agenda in the card catalogue. */
export function agendaModule(id: PolicyId | BonusId): 'moreParties' | 'turmoil' {
  return NEW_PARTIES.has(agendaInfoById(id).name as PartyName) ? 'moreParties' : 'turmoil';
}

/** Icon names used by the canonical card catalogue. */
export function expansionIconClass(expansion: GameModule): string {
  switch (expansion) {
  case 'base': return 'expansion-icon-base';
  case 'corpera': return 'expansion-icon-CE';
  case 'colonies': return 'expansion-icon-colony';
  case 'moon': return 'expansion-icon-themoon';
  default: return `expansion-icon-${expansion}`;
  }
}
