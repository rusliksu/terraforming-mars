import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayerEloBadge from '@/client/components/overview/PlayerEloBadge.vue';
import {sharedEloState} from '@/client/utils/elo';

describe('PlayerEloBadge', () => {
  afterEach(() => {
    sharedEloState.loaded = false;
    sharedEloState.failed = false;
    sharedEloState.players = {};
    sharedEloState.games = [];
  });

  it('renders signed Elo delta when provided', () => {
    sharedEloState.loaded = true;
    sharedEloState.players = {
      gydro: {
        elo: 1519,
        games: 28,
        displayName: 'GydRo',
      },
    };

    const wrapper = mount(PlayerEloBadge, {
      ...globalConfig,
      props: {
        playerName: 'GydRo',
        tooltipCss: 'tooltip tooltip-top',
        compact: true,
        eloDelta: -8,
      },
    });

    expect(wrapper.text()).to.contain('1519');
    expect(wrapper.text()).to.contain('-8');
    expect(wrapper.attributes('data-tooltip')).to.contain('Change: -8');
  });
});
