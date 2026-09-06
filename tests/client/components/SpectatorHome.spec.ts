import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import SpectatorHome from '@/client/components/SpectatorHome.vue';
import {fakeGameModel, fakePublicPlayerModel} from './testHelpers';
import {Phase} from '@/common/Phase';

describe('SpectatorHome', () => {
  it('offers replay access only after the game ends', async () => {
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
    expect(wrapper.find('a[href^="replay?"]').exists()).eq(false);
    await wrapper.setProps({spectator: {...wrapper.props('spectator'), game: fakeGameModel({phase: Phase.END})}});
    expect(wrapper.get('a[href^="replay?"]').attributes('href')).eq('replay?id=s-spectator-id');
  });

  it('does not render a separate spectator hand block', () => {
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

    expect(wrapper.find('.spectator-hands').exists()).eq(false);
    expect(wrapper.text()).not.contain('Drafted cards');
    expect(wrapper.text()).not.contain('Dealt project cards');
    const overview = wrapper.findComponent({name: 'PlayersOverview'});
    expect(overview.exists()).eq(true);
  });
});
