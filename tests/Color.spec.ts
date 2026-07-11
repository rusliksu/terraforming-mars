import {expect} from 'chai';
import {
  GAMBIT_GIRL_COLOR,
  GAMBIT_GIRL_NAME,
  GENUINE_GOLD_COLOR,
  GYDRO_COLOR,
  GYDRO_NAME,
  getPlayerIdentityByName,
  RIGATONE_COLOR,
  RIGATONE_NAME,
  SERGE_COLOR,
  SERGE_NAME,
  SONYA_CATSEYE_COLOR,
  SONYA_EMKO_NAME,
  SONYA_HYDRO_COLOR,
  SONYA_SATURN_COLOR,
  SONYA_SATURN_RINGS_COLOR,
  SONYA_TITAN_COLOR,
  SONYA_SATURN_STORM_COLOR,
  TOMA_NAME,
  VANGER_COLOR,
} from '@/common/Color';

describe('Locked player identities', () => {
  it('maps the generic Toma identity to the coral pink option', () => {
    expect(SONYA_EMKO_NAME).to.eq(TOMA_NAME);
    expect(getPlayerIdentityByName(TOMA_NAME)?.color).to.eq(SONYA_HYDRO_COLOR);
    expect(getPlayerIdentityByName(TOMA_NAME)?.colorLabel).to.eq('кораллово-розовый');
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

  it('uses a plain green label for Vanger', () => {
    const identity = getPlayerIdentityByName('Вангер');
    expect(identity?.color).to.eq(VANGER_COLOR);
    expect(identity?.colorLabel).to.eq('зелёный');
  });

  it('keeps GambitGirl as the canonical Olesya identity', () => {
    const identity = getPlayerIdentityByName('Олеся Игнатова');
    expect(GAMBIT_GIRL_NAME).to.eq('GambitGirl');
    expect(identity?.color).to.eq(GAMBIT_GIRL_COLOR);
    expect(identity?.name).to.eq(GAMBIT_GIRL_NAME);
    expect(getPlayerIdentityByName('Настроение: Мяу!')?.name).to.eq(GAMBIT_GIRL_NAME);
  });

  it('maps Serge aliases to the burgundy persona', () => {
    const identity = getPlayerIdentityByName('Сергей');
    expect(identity?.color).to.eq(SERGE_COLOR);
    expect(identity?.name).to.eq(SERGE_NAME);
    expect(identity?.colorLabel).to.eq('бордовый');
  });

  it('maps Rigat aliases to the Rigatone persona', () => {
    const identity = getPlayerIdentityByName('Ригат');
    expect(identity?.color).to.eq(RIGATONE_COLOR);
    expect(identity?.name).to.eq(RIGATONE_NAME);
    expect(identity?.name).to.eq('Тагир');
    expect(identity?.label).to.eq('Ригат Иммортал');
    expect(identity?.colorLabel).to.eq('Rigatone');
    expect(getPlayerIdentityByName('rigat immortal')?.color).to.eq(RIGATONE_COLOR);
  });
});
