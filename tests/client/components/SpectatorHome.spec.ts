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

  it('keeps spectator hands hidden until a group is revealed', async () => {
    const spectatorCards = {
      cardsInHand: [{name: 'Micro-Mills'}],
      ceoCardsInHand: [],
      draftedCards: [{name: 'Earth Catapult'}],
      dealtProjectCards: [{name: 'Earth Catapult'}],
      preludeCardsInHand: [],
    } as any;
    const player = fakePublicPlayerModel({
      spectatorCards,
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
    expect(wrapper.find('.spectator-hand-toggle').text()).eq('Cards in hand (1)');
    expect(wrapper.text()).not.contain('Drafted cards');
    expect(wrapper.text()).not.contain('Dealt project cards');
    expect(wrapper.findComponent({name: 'Card'}).exists()).eq(false);

    await wrapper.find('.spectator-hand-toggle').trigger('click');

    expect(wrapper.find('.spectator-hand-label').text()).eq('Cards in hand (1)');
    expect(wrapper.findComponent({name: 'Card'}).exists()).eq(true);
  });
});
