import {shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import PlayerInfo from '@/client/components/overview/PlayerInfo.vue';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {RecursivePartial} from '@/common/utils/utils';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel, fakeTimerModel} from '../testHelpers';
import {asComplete} from '../utils/models';
import {defineComponent, nextTick, onMounted, onUnmounted} from 'vue';
import {Tag} from '@/common/cards/Tag';

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
        player: asComplete<PublicPlayerModel>(thisPlayer),
        playerView: asComplete<PlayerViewModel>(playerView),
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

  it('remounts cached tag details when a played tag changes', async () => {
    let mounts = 0;
    let unmounts = 0;
    const PlayerTagsStub = defineComponent({
      setup() {
        onMounted(() => mounts++);
        onUnmounted(() => unmounts++);
      },
      template: '<div class="player-tags-stub"></div>',
    });
    const firstPlayer = fakePublicPlayerModel({color: 'blue'});
    const firstView = fakePlayerViewModel({
      thisPlayer: firstPlayer,
      game: fakeGameModel({gameAge: 10, undoCount: 0}),
      players: [firstPlayer],
      runId: 'first-run',
    });
    const wrapper = shallowMount(PlayerInfo, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {PlayerTags: PlayerTagsStub},
        mocks: {
          getVisibilityState: () => false,
          setVisibilityState: () => {},
          isServerSideRequestInProgress: false,
        },
      },
      props: {
        player: firstPlayer,
        playerView: firstView,
        playerIndex: 0,
        actionLabel: 'none',
      },
    });
    expect(mounts).eq(1);

    const secondPlayer = fakePublicPlayerModel({
      color: 'blue',
      tags: {...firstPlayer.tags, [Tag.VENUS]: 1},
    });
    const secondView = fakePlayerViewModel({
      thisPlayer: secondPlayer,
      game: fakeGameModel({gameAge: 11, undoCount: 0}),
      players: [secondPlayer],
      runId: 'second-run',
    });
    await wrapper.setProps({player: secondPlayer, playerView: secondView});
    await nextTick();

    expect(mounts).eq(2);
    expect(unmounts).eq(1);
    wrapper.unmount();
  });
});
