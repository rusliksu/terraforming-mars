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

  it('shows a neutral reliability marker only after the threshold is reached', () => {
    sharedEloState.loaded = true;
    sharedEloState.players = {
      gydro: {
        elo: 1519,
        games: 28,
        displayName: 'GydRo',
        completionReliability: {games: 10, leaves: 3, rate: 0.3},
      },
    };

    const wrapper = mount(PlayerEloBadge, {
      ...globalConfig,
      props: {
        playerName: 'GydRo',
        tooltipCss: 'tooltip tooltip-top',
        compact: true,
      },
    });

    expect(wrapper.text()).to.contain('Ливы 3/10');
    expect(wrapper.find('.player-reliability-badge').attributes('title')).to.contain('30%');
  });

  it('does not show a reliability marker below the threshold', () => {
    sharedEloState.loaded = true;
    sharedEloState.players = {
      gydro: {
        elo: 1519,
        games: 28,
        displayName: 'GydRo',
        completionReliability: {games: 10, leaves: 2, rate: 0.2},
      },
    };

    const wrapper = mount(PlayerEloBadge, {
      ...globalConfig,
      props: {
        playerName: 'GydRo',
        tooltipCss: 'tooltip tooltip-top',
        compact: true,
      },
    });

    expect(wrapper.find('.player-reliability-badge').exists()).eq(false);
  });

  it('shows the marker at exactly twenty percent', () => {
    sharedEloState.loaded = true;
    sharedEloState.players = {
      gydro: {
        elo: 1519,
        games: 28,
        displayName: 'GydRo',
        completionReliability: {games: 15, leaves: 3, rate: 0.2},
      },
    };

    const wrapper = mount(PlayerEloBadge, {
      ...globalConfig,
      props: {
        playerName: 'GydRo',
        tooltipCss: 'tooltip tooltip-top',
        compact: true,
      },
    });

    expect(wrapper.find('.player-reliability-badge').exists()).eq(true);
  });

  it('honors the server eligibility flag', () => {
    sharedEloState.loaded = true;
    sharedEloState.players = {
      gydro: {
        elo: 1519,
        games: 28,
        displayName: 'GydRo',
        completionReliability: {games: 10, leaves: 3, rate: 0.3, eligible: false},
      },
    };

    const wrapper = mount(PlayerEloBadge, {
      ...globalConfig,
      props: {
        playerName: 'GydRo',
        tooltipCss: 'tooltip tooltip-top',
        compact: true,
      },
    });

    expect(wrapper.find('.player-reliability-badge').exists()).eq(false);
  });
});
