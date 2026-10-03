import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import GameSetupDetail from '@/client/components/GameSetupDetail.vue';
import {fakeGameOptionsModel} from './testHelpers';
import {Expansion} from '@/common/cards/GameModule';

// Every expansion this screen should show an icon for, mapped to its icon's CSS class suffix -
// most match the expansion key exactly, but a few (inherited from CreateGameForm.vue's own
// icon classes) don't: Corporate Era is "CE", Colonies is "colony", the Moon is "themoon".
const EXPANSION_ICON_CLASSES: Record<Expansion, string> = {
  corpera: 'CE',
  promo: 'promo',
  venus: 'venus',
  colonies: 'colony',
  prelude: 'prelude',
  prelude2: 'prelude2',
  turmoil: 'turmoil',
  community: 'community',
  ares: 'ares',
  moon: 'themoon',
  pathfinders: 'pathfinders',
  ceo: 'ceo',
  starwars: 'starwars',
  underworld: 'underworld',
  deltaProject: 'deltaProject',
  sillyfication: 'sillyfication',
  betterMars: 'betterMars',
  customCards: 'customCards',
  conglomerates: 'conglomerates',
  corporateBetterments: 'corporateBetterments',
  idesOfMars: 'idesOfMars',
  robAntilles: 'robAntilles',
  moreParties: 'moreParties',
  venusPhase2: 'venusPhase2',
  industries: 'industries',
  highOrbit: 'highOrbit',
  solaris: 'solaris',
};

describe('GameSetupDetail', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(GameSetupDetail, {
      ...globalConfig,
      props: {
        playerNumber: 2,
        gameOptions: fakeGameOptionsModel(),
        lastSoloGeneration: 14,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows one-way 10-card initial draft in setup details', () => {
    const wrapper = shallowMount(GameSetupDetail, {
      ...globalConfig,
      props: {
        playerNumber: 2,
        gameOptions: fakeGameOptionsModel({
          initialDraftVariant: true,
          initialDraftOneWay: true,
        }),
        lastSoloGeneration: 14,
      },
    });

    expect(wrapper.text()).to.contain('Initial');
    expect(wrapper.text()).to.contain('10-card one-way (experimental)');
  });

  it('shows an icon for every enabled expansion', () => {
    const allEnabled = Object.fromEntries(
      Object.keys(EXPANSION_ICON_CLASSES).map((expansion) => [expansion, true]),
    ) as Record<Expansion, boolean>;

    const wrapper = shallowMount(GameSetupDetail, {
      ...globalConfig,
      props: {
        playerNumber: 2,
        gameOptions: fakeGameOptionsModel({expansions: allEnabled}),
        lastSoloGeneration: 14,
      },
    });

    for (const [expansion, iconClass] of Object.entries(EXPANSION_ICON_CLASSES)) {
      expect(wrapper.find(`.expansion-icon-${iconClass}`).exists(), expansion).to.be.true;
    }
  });

  it('does not show an icon for a disabled expansion', () => {
    const allDisabled = Object.fromEntries(
      Object.keys(EXPANSION_ICON_CLASSES).map((expansion) => [expansion, false]),
    ) as Record<Expansion, boolean>;

    const wrapper = shallowMount(GameSetupDetail, {
      ...globalConfig,
      props: {
        playerNumber: 2,
        gameOptions: fakeGameOptionsModel({expansions: allDisabled}),
        lastSoloGeneration: 14,
      },
    });

    for (const iconClass of Object.values(EXPANSION_ICON_CLASSES)) {
      expect(wrapper.find(`.expansion-icon-${iconClass}`).exists(), iconClass).to.be.false;
    }
  });
});
