import {expect} from 'chai';
import {
  buildPlayerProfilesFromEloPlayers,
  getPlayerProfileAvatarInitials,
  getPlayerProfileAvatarPattern,
  getPlayerProfileByName,
  PLAYER_PROFILES,
} from '@/common/PlayerProfiles';

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

  it('builds active player profiles from Elo players', () => {
    const profiles = buildPlayerProfilesFromEloPlayers({
      genuinegold: {displayName: 'GenuineGold', games: 48, elo: 1749},
      vladlen: {displayName: 'Владлен', games: 24, elo: 1691},
      leha: {displayName: 'Леха', games: 6, elo: 1452},
      inactive: {displayName: 'Inactive', games: 0, elo: 1600},
    });

    expect(profiles.map((profile) => profile.name)).deep.eq(['GenuineGold', 'Владлен', 'Леха']);
    expect(profiles.map((profile) => profile.id)).deep.eq(['genuinegold', 'владлен', 'leha']);
    expect(getPlayerProfileByName('Асмо', profiles)?.name).eq('Леха');
  });

  it('uses reserved player colors for Elo-built profiles', () => {
    const profiles = buildPlayerProfilesFromEloPlayers({
      genuinegold: {displayName: 'GenuineGold', games: 48, elo: 1749},
      vladlen: {displayName: 'Владлен', games: 24, elo: 1691},
      gydro: {displayName: 'GydRo', games: 60, elo: 1681},
      antistress: {displayName: 'Антистресс', games: 23, elo: 1409},
    });

    expect(getPlayerProfileByName('GydRo', profiles)?.preferredColor).eq('pearl');
    expect(getPlayerProfileByName('Руслан', profiles)?.name).eq('GydRo');
    expect(getPlayerProfileByName('GenuineGold', profiles)?.preferredColor).eq('gold');
    expect(getPlayerProfileByName('Антистресс', profiles)?.preferredColor).eq('antistress');
  });

  it('keeps Elo and deterministic avatar metadata on built profiles', () => {
    const profiles = buildPlayerProfilesFromEloPlayers({
      genuinegold: {displayName: 'GenuineGold', games: 48, elo: 1749},
    });

    expect(profiles[0].elo).eq(1749);
    expect(profiles[0].games).eq(48);
    expect(getPlayerProfileAvatarInitials(profiles[0])).eq('GG');
    expect(getPlayerProfileAvatarPattern(profiles[0])).eq(getPlayerProfileAvatarPattern(profiles[0]));
  });
});
