import {expect} from 'chai';
import {
  buildPlayerProfilesFromEloPlayers,
  getPlayerProfileAvatarInitials,
  getPlayerProfileAvatarPattern,
  getPlayerProfileByName,
  getPlayerProfilePreferredColors,
  PLAYER_PROFILES,
} from '@/common/PlayerProfiles';

describe('Player profiles', () => {
  it('maps known nick aliases to canonical profiles', () => {
    expect(getPlayerProfileByName('Лёха Инженер')?.name).eq('Леха');
    expect(getPlayerProfileByName('Асмо')?.name).eq('Леха');
    expect(getPlayerProfileByName('Алексей Часовщик')?.name).eq('Qiksa');
    expect(getPlayerProfileByName('Qiksa')?.name).eq('Qiksa');
    expect(getPlayerProfileByName('Женя')?.name).eq('vvbMinsk');
    expect(getPlayerProfileByName('Midilobusim')?.name).eq('Nuke');
    expect(getPlayerProfileByName('Midilobisum')?.name).eq('Nuke');
    expect(getPlayerProfileByName('Никита_Кусков')?.name).eq('Никита Кусков');
    expect(getPlayerProfileByName('Никитос')).eq(undefined);
  });

  it('keeps profile ids unique', () => {
    expect(new Set(PLAYER_PROFILES.map((profile) => profile.id)).size).eq(PLAYER_PROFILES.length);
  });

  it('keeps ordered color preferences compatible with the primary color', () => {
    const profile = getPlayerProfileByName('Никита Кусков')!;

    expect(profile.preferredColor).eq('orange');
    expect(getPlayerProfilePreferredColors(profile)).deep.eq(['orange']);
    expect(getPlayerProfilePreferredColors({
      ...profile,
      preferredColors: ['blue', 'orange', 'yellow'],
    })).deep.eq(['orange', 'blue', 'yellow']);
  });

  it('builds active player profiles from Elo players', () => {
    const profiles = buildPlayerProfilesFromEloPlayers({
      genuinegold: {displayName: 'GenuineGold', games: 48, elo: 1749},
      vladlen: {displayName: 'Владлен', games: 24, elo: 1691},
      alexey: {displayName: 'Алексей', games: 19, elo: 1269},
      timur: {displayName: 'Тимур', games: 17, elo: 1506},
      vvbminsk: {displayName: 'vvbMinsk', games: 11, elo: 1535},
      nuke: {displayName: 'Nuke', games: 7, elo: 1497},
      leha: {displayName: 'Леха', games: 6, elo: 1452},
      inactive: {displayName: 'Inactive', games: 0, elo: 1600},
    });

    expect(profiles.map((profile) => profile.name)).deep.eq(['GenuineGold', 'Владлен', 'vvbMinsk', 'Тимур', 'Nuke', 'Леха', 'Qiksa']);
    expect(profiles.map((profile) => profile.id)).deep.eq(['genuinegold', 'vladlen', 'vvbminsk', 'timur', 'nuke', 'leha', 'qiksa']);
    expect(getPlayerProfileByName('Асмо', profiles)?.name).eq('Леха');
    expect(getPlayerProfileByName('Алексей', profiles)?.name).eq('Qiksa');
  });

  it('uses observed favorite colors for Elo-built profiles', () => {
    const profiles = buildPlayerProfilesFromEloPlayers({
      alexey: {displayName: 'Алексей', games: 19, elo: 1269},
      vladlen: {displayName: 'Владлен', games: 24, elo: 1691},
      timur: {displayName: 'Тимур', games: 17, elo: 1506},
      vvbminsk: {displayName: 'vvbMinsk', games: 11, elo: 1535},
      nuke: {displayName: 'Nuke', games: 7, elo: 1497},
      tagir: {displayName: 'Тагир', games: 18, elo: 1618},
      anya: {displayName: 'Аня', games: 21, elo: 1531},
    });

    expect(getPlayerProfileByName('Qiksa', profiles)?.preferredColor).eq('black');
    expect(getPlayerProfileByName('Владлен', profiles)?.preferredColor).eq('red');
    expect(getPlayerProfileByName('Тимур', profiles)?.preferredColor).eq('red');
    expect(getPlayerProfileByName('vvbMinsk', profiles)?.preferredColor).eq('purple');
    expect(getPlayerProfileByName('Nuke', profiles)?.preferredColor).eq('black');
    expect(getPlayerProfileByName('Тагир', profiles)?.preferredColor).eq('rigatone');
    expect(getPlayerProfileByName('Ригат Иммортал', profiles)?.name).eq('Тагир');
    expect(getPlayerProfileByName('Аня', profiles)?.preferredColor).eq('green');
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
