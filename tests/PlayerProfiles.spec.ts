import {expect} from 'chai';
import {getPlayerProfileByName, PLAYER_PROFILES} from '@/common/PlayerProfiles';

describe('Player profiles', () => {
  it('maps known nick aliases to canonical profiles', () => {
    expect(getPlayerProfileByName('Лёха Инженер')?.name).eq('Леха');
    expect(getPlayerProfileByName('Асмо')?.name).eq('Леха');
    expect(getPlayerProfileByName('Алексей Часовщик')?.name).eq('Алексей');
    expect(getPlayerProfileByName('Женя')?.name).eq('vvbMinsk');
    expect(getPlayerProfileByName('Midilobusim')?.name).eq('Nuke');
  });

  it('keeps profile ids unique', () => {
    expect(new Set(PLAYER_PROFILES.map((profile) => profile.id)).size).eq(PLAYER_PROFILES.length);
  });
});
