import {expect} from 'chai';
import {
  GENUINE_GOLD_COLOR,
  GYDRO_COLOR,
  GYDRO_NAME,
  getPlayerIdentityByName,
  SONYA_CATSEYE_COLOR,
  SONYA_EMKO_NAME,
  SONYA_HYDRO_COLOR,
  SONYA_SATURN_COLOR,
  SONYA_SATURN_RINGS_COLOR,
  SONYA_TITAN_COLOR,
  SONYA_SATURN_STORM_COLOR,
  TOMA_NAME,
} from '@/common/Color';

describe('Locked player identities', () => {
  it('maps the generic Toma identity to the moody dark purple option', () => {
    expect(SONYA_EMKO_NAME).to.eq(TOMA_NAME);
    expect(getPlayerIdentityByName(TOMA_NAME)?.color).to.eq(SONYA_HYDRO_COLOR);
    expect(getPlayerIdentityByName('тома')?.color).to.eq(SONYA_HYDRO_COLOR);
    expect(getPlayerIdentityByName('соня')?.color).to.eq(SONYA_HYDRO_COLOR);
    expect(getPlayerIdentityByName('соня эмко')?.color).to.eq(SONYA_HYDRO_COLOR);
    expect(getPlayerIdentityByName('emko')?.color).to.eq(SONYA_HYDRO_COLOR);
  });

  it('maps the generic GydRo identity to the pearl option', () => {
    expect(getPlayerIdentityByName(GYDRO_NAME)?.color).to.eq(GYDRO_COLOR);
    expect(getPlayerIdentityByName('gydro')?.color).to.eq(GYDRO_COLOR);
    expect(getPlayerIdentityByName('руслан')?.color).to.eq(GYDRO_COLOR);
  });

  it('keeps explicit legacy Toma color aliases available without making them generic', () => {
    expect(getPlayerIdentityByName('sonya saturn')?.color).to.eq(SONYA_SATURN_COLOR);
    expect(getPlayerIdentityByName('соня кольца')?.color).to.eq(SONYA_SATURN_RINGS_COLOR);
    expect(getPlayerIdentityByName('sonya titan')?.color).to.eq(SONYA_TITAN_COLOR);
    expect(getPlayerIdentityByName('sonya storm')?.color).to.eq(SONYA_SATURN_STORM_COLOR);
    expect(getPlayerIdentityByName('saturn systems')?.color).to.eq(SONYA_SATURN_STORM_COLOR);
    expect(getPlayerIdentityByName('sonya cat eye')?.color).to.eq(SONYA_CATSEYE_COLOR);
  });

  it('does not map Pesha aliases to Pasha', () => {
    expect(getPlayerIdentityByName('Пеша')).to.eq(undefined);
    expect(getPlayerIdentityByName('pesha')).to.eq(undefined);
  });

  it('maps spaced Genuine Gold aliases to the gold persona', () => {
    const identity = getPlayerIdentityByName('Genuine Gold');
    expect(identity?.color).to.eq(GENUINE_GOLD_COLOR);
    expect(identity?.name).to.eq('GenuineGold');
  });
});
