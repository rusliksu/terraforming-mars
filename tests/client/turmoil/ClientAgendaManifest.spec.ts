import {expect} from 'chai';
import {getAgenda, getPartyAgendaIds} from '@/client/turmoil/ClientAgendaManifest';
import {PartyName} from '@/common/turmoil/PartyName';

describe('ClientAgendaManifest', () => {
  it('separates bonuses and policies for More Parties prefixes', () => {
    const ids = getPartyAgendaIds(PartyName.SPOME, true);
    expect(ids.bonuses).to.deep.eq(['spob01', 'spob02']);
    expect(ids.policies).to.deep.eq(['spop01', 'spop02', 'spop03', 'spop04']);
  });

  it('switches Mars First bonus 1 to the building-and-Mars wording for Better Mars', () => {
    expect(getAgenda('mb01', false, false)?.description).to.eq('Gain 1 M€ for each building tag you have');
    expect(getAgenda('mb01', false, true)?.description).to.eq('Gain 1 M€ for every building and Mars tag you have');
    // More Parties keeps its own wording for the same rule.
    expect(getAgenda('mb01', true, false)?.description).to.eq('Gain 1 M€ for every building and Mars tag you have');
    expect(getPartyAgendaIds(PartyName.MARS, false, true).bonuses).to.deep.eq(['mb01', 'mb02']);
  });
});
