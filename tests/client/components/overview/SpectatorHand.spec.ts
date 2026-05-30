import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import SpectatorHand from '@/client/components/overview/SpectatorHand.vue';
import {fakePublicPlayerModel} from '../testHelpers';

describe('SpectatorHand', () => {
  it('renders all available spectator card groups inside the opened panel', () => {
    const player = fakePublicPlayerModel({
      color: 'blue',
      name: 'Blue',
      spectatorCards: {
        cardsInHand: [{name: 'Micro-Mills'} as any],
        ceoCardsInHand: [],
        dealtCorporationCards: [],
        dealtPreludeCards: [],
        dealtCeoCards: [],
        dealtProjectCards: [{name: 'Earth Catapult'} as any],
        draftedCards: [{name: 'Sponsors'} as any],
        pickedCorporationCard: [],
        preludeCardsInHand: [],
      },
    });
    const wrapper = shallowMount(SpectatorHand, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mocks: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
          isServerSideRequestInProgress: false,
        },
      },
      props: {
        player,
        playerIndex: 0,
      },
    });

    expect(wrapper.text()).to.contain('Cards in hand (1)');
    expect(wrapper.text()).to.contain('Drafted cards (1)');
    expect(wrapper.text()).to.contain('Dealt project cards (1)');
    expect(wrapper.findAllComponents({name: 'Card'})).has.length(3);
  });
});
