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

  it('shows separate table and spectator hand controls', async () => {
    const player = fakePublicPlayerModel({
      color: 'blue',
      name: 'Blue',
      tableau: [{name: CardName.HELION} as any],
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
    expect(playerInfo.find('.player-info-details .player-card-controls').exists()).eq(false);
    expect(playerInfo.find('.player-played-cards .player-card-controls .player-table-button').exists()).eq(true);
    expect(playerInfo.find('.player-played-cards .player-card-controls .spectator-hand-button').exists()).eq(true);
    expect(playerInfo.find('.spectator-hand-button').text()).eq('');
    expect(playerInfo.find('.spectator-hand-button').attributes('title')).eq('hand');
    expect((playerInfo.vm as any).spectatorHandCardCount()).eq(3);

    await playerInfo.find('.spectator-hand-button').trigger('click');

    expect(visibility.spectator_hand_0).eq(true);
  });
});
