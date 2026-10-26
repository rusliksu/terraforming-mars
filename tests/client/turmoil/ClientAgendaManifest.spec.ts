import {expect} from 'chai';
import {getPartyAgendaIds} from '@/client/turmoil/ClientAgendaManifest';
import {PartyName} from '@/common/turmoil/PartyName';

describe('ClientAgendaManifest', () => {
  it('separates bonuses and policies for More Parties prefixes', () => {
    const ids = getPartyAgendaIds(PartyName.SPOME, true);
    expect(ids.bonuses).to.deep.eq(['spob01', 'spob02']);
    expect(ids.policies).to.deep.eq(['spop01', 'spop02', 'spop03', 'spop04']);
  });
});
