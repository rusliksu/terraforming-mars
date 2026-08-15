import {shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import PlayerInfo from '@/client/components/overview/PlayerInfo.vue';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {RecursivePartial} from '@/common/utils/utils';
import {fakeGameModel, fakePublicPlayerModel, fakeTimerModel} from '../testHelpers';

describe('PlayerInfo', () => {
  it('Played card count test', () => {
    const thisPlayer: RecursivePartial<PublicPlayerModel> = {
      color: 'blue',
      tableau: [
        {name: CardName.HELION},
        {name: CardName.ACQUIRED_COMPANY},
        {name: CardName.BACTOVIRAL_RESEARCH},
      ],
      timer: fakeTimerModel(),
      victoryPointsBreakdown: {
        total: 1,
      },
      tags: {},
    };
    const playerView: RecursivePartial<PlayerViewModel> = {
      thisPlayer: thisPlayer,
      id: 'playerid-foo',
      game: {
        gameOptions: {
          showTimers: false,
        },
      },
      players: [thisPlayer],
    };
    const playerInfo = shallowMount(PlayerInfo, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mocks: {
          getVisibilityState: () => false,
          setVisibilityState: () => {},
          isServerSideRequestInProgress: false,
        },
      },
      props: {
        player: thisPlayer,
        playerView: playerView,
        playerIndex: 0,
        actionLabel: 'none',
      },
    });
    const test = playerInfo.find('div[class*="played-cards-count"]');
    expect(test.text()).to.eq('3');
  });

  it('does not show spectator hand control to a spectator', () => {
    const player = fakePublicPlayerModel({
      color: 'blue',
      name: 'Blue',
      tableau: [{name: CardName.HELION} as any],
      spectatorCards: {
        cardsInHand: [{name: 'Micro-Mills'} as any],
        ceoCardsInHand: [],
        preludeCardsInHand: [{name: 'Self-Sufficient Settlement'} as any],
      },
    });
    const playerView = {
      id: 's-spectator-id',
      thisPlayer: undefined,
      game: fakeGameModel(),
      players: [player],
      runId: 'run-id',
    } as any as PlayerViewModel;
    const visibility: Record<string, boolean> = {};
    const playerInfo = shallowMount(PlayerInfo, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mocks: {
          getVisibilityState: (key: string) => visibility[key] === true,
          setVisibilityState: (key: string, value: boolean) => {
            visibility[key] = value;
          },
          isServerSideRequestInProgress: false,
        },
      },
      props: {
        player,
        playerView,
        playerIndex: 0,
        actionLabel: 'none',
      },
    });

    expect(playerInfo.find('.played-cards-button').attributes('title')).eq('table');
    expect(playerInfo.find('.spectator-hand-button').exists()).eq(false);
    expect(visibility.spectator_hand_0).eq(undefined);
  });

  it('shows Elo rating next to the player name', () => {
    const player = fakePublicPlayerModel({
      color: 'blue',
      name: 'GydRo',
      tableau: [{name: CardName.HELION} as any],
    });
    const playerView = {
      id: 'player-id',
      thisPlayer: player,
      game: fakeGameModel(),
      players: [player],
      runId: 'run-id',
    } as any as PlayerViewModel;

    const playerInfo = shallowMount(PlayerInfo, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mocks: {
          getVisibilityState: () => false,
          setVisibilityState: () => {},
          isServerSideRequestInProgress: false,
        },
      },
      props: {
        player,
        playerView,
        playerIndex: 0,
        actionLabel: 'none',
      },
    });

    const badge = playerInfo.findComponent({name: 'PlayerEloBadge'});
    expect(badge.exists()).eq(true);
    expect(badge.props('playerName')).eq('GydRo');
    expect(badge.props('compact')).eq(true);
  });

  it('passes end-game Elo delta to the rating badge', () => {
    const player = fakePublicPlayerModel({
      color: 'blue',
      name: 'GydRo',
      tableau: [{name: CardName.HELION} as any],
    });
    const playerView = {
      id: 'player-id',
      thisPlayer: player,
      game: fakeGameModel(),
      players: [player],
      runId: 'run-id',
    } as any as PlayerViewModel;

    const playerInfo = shallowMount(PlayerInfo, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mocks: {
          getVisibilityState: () => false,
          setVisibilityState: () => {},
          isServerSideRequestInProgress: false,
        },
      },
      props: {
        player,
        playerView,
        playerIndex: 0,
        actionLabel: 'none',
        eloDelta: -8,
      },
    });

    const badge = playerInfo.findComponent({name: 'PlayerEloBadge'});
    expect(badge.props('eloDelta')).eq(-8);
  });

  it('shows a bot-controlled marker', () => {
    const player = fakePublicPlayerModel({isBotControlled: true});
    const playerView = {
      id: 'player-id',
      thisPlayer: player,
      game: fakeGameModel(),
      players: [player],
      runId: 'run-id',
    } as any as PlayerViewModel;

    const playerInfo = shallowMount(PlayerInfo, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mocks: {
          getVisibilityState: () => false,
          setVisibilityState: () => {},
          isServerSideRequestInProgress: false,
        },
      },
      props: {player, playerView, playerIndex: 0, actionLabel: 'none'},
    });

    const marker = playerInfo.find('.bot-controlled-marker');
    expect(marker.exists()).is.true;
    expect(marker.text()).eq('BOT');
  });

  it('does not show spectator hand control to a player', () => {
    const player = fakePublicPlayerModel({
      color: 'blue',
      name: 'Blue',
      tableau: [{name: CardName.HELION} as any],
      spectatorCards: {
        cardsInHand: [{name: 'Micro-Mills'} as any],
        ceoCardsInHand: [],
        preludeCardsInHand: [],
      },
    });
    const playerView = {
      id: 'player-id',
      thisPlayer: player,
      game: fakeGameModel(),
      players: [player],
      runId: 'run-id',
    } as any as PlayerViewModel;

    const playerInfo = shallowMount(PlayerInfo, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mocks: {
          getVisibilityState: () => false,
          setVisibilityState: () => {},
          isServerSideRequestInProgress: false,
        },
      },
      props: {
        player,
        playerView,
        playerIndex: 0,
        actionLabel: 'none',
      },
    });

    expect(playerInfo.find('.spectator-hand-button').exists()).eq(false);
  });
});
