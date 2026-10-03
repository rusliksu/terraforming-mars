import {expect} from 'chai';
import {agendaInfoById, agendaIdDescription} from '../../../src/common/turmoil/Types';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('agendaInfoById', () => {
  it('parses a single-character party prefix (official parties)', () => {
    expect(agendaInfoById('mb01')).to.deep.eq({name: PartyName.MARS, type: 'Bonus', num: '01'});
    expect(agendaInfoById('gp04')).to.deep.eq({name: PartyName.GREENS, type: 'Policy', num: '04'});
  });

  it('parses a multi-character party prefix (More Parties)', () => {
    expect(agendaInfoById('burb02')).to.deep.eq({name: PartyName.BUREAUCRATS, type: 'Bonus', num: '02'});
    expect(agendaInfoById('trap04')).to.deep.eq({name: PartyName.TRANSHUMANISTS, type: 'Policy', num: '04'});
    expect(agendaInfoById('popb01')).to.deep.eq({name: PartyName.POPULISTS, type: 'Bonus', num: '01'});
    expect(agendaInfoById('spop03')).to.deep.eq({name: PartyName.SPOME, type: 'Policy', num: '03'});
    expect(agendaInfoById('empp02')).to.deep.eq({name: PartyName.EMPOWER, type: 'Policy', num: '02'});
    expect(agendaInfoById('cenb02')).to.deep.eq({name: PartyName.CENTRISTS, type: 'Bonus', num: '02'});
  });

  it('agendaIdDescription includes the full party name, not just a prefix letter', () => {
    expect(agendaIdDescription('burb02')).to.eq('Bureaucrats Bonus 02');
    expect(agendaIdDescription('mp01')).to.eq('Mars First Policy 01');
  });
});
