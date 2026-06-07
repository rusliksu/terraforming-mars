import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import {fakePublicPlayerModel, fakeViewModel} from '../testHelpers';

describe('PlayersOverview', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(PlayersOverview, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakeViewModel(),
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('does not count setup choices as spectator hand cards', () => {
    const wrapper = shallowMount(PlayersOverview, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakeViewModel(),
      },
    });
    const player = fakePublicPlayerModel({
      spectatorCards: {
        cardsInHand: [],
        ceoCardsInHand: [{name: 'Chief Executive Officer'} as any],
        dealtCorporationCards: [{name: 'CrediCor'} as any],
        dealtPreludeCards: [{name: 'Donation'} as any],
        dealtCeoCards: [{name: 'Alicia'} as any],
        dealtProjectCards: [],
        draftedCards: [],
        pickedCorporationCard: [{name: 'Helion'} as any],
        preludeCardsInHand: [{name: 'Self-Sufficient Settlement'} as any],
      },
    });

    expect((wrapper.vm as any).spectatorHandCardCount(player)).eq(0);
  });
});
