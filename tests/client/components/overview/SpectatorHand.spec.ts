import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import SpectatorHand from '@/client/components/overview/SpectatorHand.vue';
import {fakePublicPlayerModel} from '../testHelpers';

describe('SpectatorHand', () => {
  it('renders only project hand groups inside the opened panel', () => {
    const player = fakePublicPlayerModel({
      color: 'blue',
      name: 'Blue',
      spectatorCards: {
        cardsInHand: [{name: 'Micro-Mills'} as any],
        ceoCardsInHand: [{name: 'Chief Executive Officer'} as any],
        dealtCorporationCards: [{name: 'CrediCor'} as any],
        dealtPreludeCards: [{name: 'Donation'} as any],
        dealtCeoCards: [{name: 'Alicia'} as any],
        dealtProjectCards: [{name: 'Earth Catapult'} as any],
        draftedCards: [{name: 'Sponsors'} as any],
        pickedCorporationCard: [{name: 'Helion'} as any],
        preludeCardsInHand: [{name: 'Self-Sufficient Settlement'} as any],
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
    expect(wrapper.text()).to.contain('Project cards to choose (1)');
    expect(wrapper.text()).not.to.contain('Dealt');
    expect(wrapper.text()).not.to.contain('corporation');
    expect(wrapper.text()).not.to.contain('Prelude');
    expect(wrapper.text()).not.to.contain('CEO');
    expect(wrapper.findAllComponents({name: 'Card'})).has.length(3);
  });
});
