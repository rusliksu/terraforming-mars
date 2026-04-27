import {expect} from 'chai';
import {normalizeEloPlayerName} from '@/client/utils/normalizeEloPlayerName';

describe('normalizeEloPlayerName', () => {
  it('normalizes known aliases from shared elo config', () => {
    expect(normalizeEloPlayerName('Rav')).to.eq('рав');
    expect(normalizeEloPlayerName('Равиль')).to.eq('рав');
    expect(normalizeEloPlayerName('genuinegold')).to.eq('genuinegold');
    expect(normalizeEloPlayerName('Руслан')).to.eq('gydro');
    expect(normalizeEloPlayerName('Аня')).to.eq('аня');
  });
});
