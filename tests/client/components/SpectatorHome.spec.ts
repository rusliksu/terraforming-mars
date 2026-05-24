import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import SpectatorHome from '@/client/components/SpectatorHome.vue';
import {fakeGameModel, fakePublicPlayerModel} from './testHelpers';

describe('SpectatorHome', () => {
  it('mounts without errors', () => {
    const player = fakePublicPlayerModel();
    const wrapper = shallowMount(SpectatorHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
          updateSpectator: () => {},
        },
      } as any,
      props: {
        spectator: {
          game: fakeGameModel(),
          players: [player],
          id: 's-spectator-id',
          thisPlayer: player,
          runId: 'run-id',
          color: 'neutral',
        },
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('renders revealed spectator hands when present', () => {
    const player = fakePublicPlayerModel({
      spectatorCards: {
        cardsInHand: [{name: 'Micro-Mills'} as any],
        ceoCardsInHand: [],
        dealtCorporationCards: [],
        dealtPreludeCards: [],
        dealtCeoCards: [],
        dealtProjectCards: [],
        draftedCards: [],
        pickedCorporationCard: [],
        preludeCardsInHand: [],
      },
    });
    const wrapper = shallowMount(SpectatorHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
          updateSpectator: () => {},
        },
      } as any,
      props: {
        spectator: {
          game: fakeGameModel(),
          players: [player],
          id: 's-spectator-id',
          thisPlayer: undefined,
          runId: 'run-id',
          color: 'neutral',
        },
      },
    });

    expect(wrapper.find('.spectator-hands').exists()).eq(true);
    expect(wrapper.find('.spectator-hand-label').text()).eq('Cards in hand (1)');
  });
});
