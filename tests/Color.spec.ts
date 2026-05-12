import {expect} from 'chai';
import {
  getPlayerIdentityByName,
  SONYA_CATSEYE_COLOR,
  SONYA_EMKO_NAME,
  SONYA_SATURN_COLOR,
  SONYA_SATURN_RINGS_COLOR,
  SONYA_TITAN_COLOR,
  SONYA_SATURN_STORM_COLOR,
  TOMA_NAME,
} from '@/common/Color';

describe('Locked player identities', () => {
  it('maps the generic Toma identity to the Saturn Systems purple option', () => {
    expect(SONYA_EMKO_NAME).to.eq(TOMA_NAME);
    expect(getPlayerIdentityByName(TOMA_NAME)?.color).to.eq(SONYA_SATURN_STORM_COLOR);
    expect(getPlayerIdentityByName('тома')?.color).to.eq(SONYA_SATURN_STORM_COLOR);
    expect(getPlayerIdentityByName('соня')?.color).to.eq(SONYA_SATURN_STORM_COLOR);
    expect(getPlayerIdentityByName('соня эмко')?.color).to.eq(SONYA_SATURN_STORM_COLOR);
    expect(getPlayerIdentityByName('emko')?.color).to.eq(SONYA_SATURN_STORM_COLOR);
    expect(getPlayerIdentityByName('saturn systems')?.color).to.eq(SONYA_SATURN_STORM_COLOR);
  });

  it('keeps explicit legacy Toma color aliases available without making them generic', () => {
    expect(getPlayerIdentityByName('sonya saturn')?.color).to.eq(SONYA_SATURN_COLOR);
    expect(getPlayerIdentityByName('соня кольца')?.color).to.eq(SONYA_SATURN_RINGS_COLOR);
    expect(getPlayerIdentityByName('sonya titan')?.color).to.eq(SONYA_TITAN_COLOR);
    expect(getPlayerIdentityByName('sonya storm')?.color).to.eq(SONYA_SATURN_STORM_COLOR);
    expect(getPlayerIdentityByName('sonya cat eye')?.color).to.eq(SONYA_CATSEYE_COLOR);
  });

  it('does not map Pesha aliases to Pasha', () => {
    expect(getPlayerIdentityByName('Пеша')).to.eq(undefined);
    expect(getPlayerIdentityByName('pesha')).to.eq(undefined);
  });
});
