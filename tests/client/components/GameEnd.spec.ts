import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import GameEnd from '@/client/components/GameEnd.vue';
import {fakePlayerViewModel, fakePublicPlayerModel, fakeSpectatorModel} from './testHelpers';

describe('GameEnd', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(GameEnd, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel(),
        spectator: fakeSpectatorModel(),
      },
    });
    expect(wrapper.exists()).to.be.true;
    expect(wrapper.text()).to.contain('Rematch (same setup)');
    expect(wrapper.text()).not.to.contain('Spectator:');
    const rematchLink = wrapper.findAll('a').find((link) => link.text().includes('Rematch (same setup)'));
    expect(rematchLink).to.not.be.undefined;
    expect(rematchLink?.attributes('title')).to.eq('Start a new game with the same initial setup');
    expect(rematchLink?.attributes('href')).to.contain('new-game?cloneGameId=');
  });

  it('places surrendered players last and marks them', () => {
    const winner = fakePublicPlayerModel({
      id: 'p-winner' as any,
      name: 'Winner',
      victoryPointsBreakdown: {total: 70},
    });
    const surrendered = fakePublicPlayerModel({
      id: 'p-surrendered' as any,
      name: 'Surrendered',
      isBotControlled: true,
      isSurrendered: true,
      victoryPointsBreakdown: {total: 100},
    });
    const wrapper = shallowMount(GameEnd, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel({
          players: [surrendered, winner],
          thisPlayer: winner,
        }),
        spectator: fakeSpectatorModel(),
      },
    });

    expect((wrapper.vm as any).playersInPlace.map((player: {name: string}) => player.name)).deep.eq(['Winner', 'Surrendered']);
    const flag = wrapper.find('[data-test="surrendered-player-flag"]');
    expect(flag.exists()).eq(true);
    expect(flag.attributes('title')).eq('Surrendered');
    expect(wrapper.find('.bot-controlled-marker').exists()).eq(true);
    expect(wrapper.text()).not.to.contain('Left');
  });

  it('orders surrendered players by VP then megacredits', () => {
    const winner = fakePublicPlayerModel({
      id: 'p-winner' as any,
      name: 'Winner',
      victoryPointsBreakdown: {total: 70},
    });
    const lowCash = fakePublicPlayerModel({
      id: 'p-low-cash' as any,
      name: 'Low cash',
      isSurrendered: true,
      megacredits: 5,
      victoryPointsBreakdown: {total: 100},
    });
    const highCash = fakePublicPlayerModel({
      id: 'p-high-cash' as any,
      name: 'High cash',
      isSurrendered: true,
      megacredits: 15,
      victoryPointsBreakdown: {total: 100},
    });
    const wrapper = shallowMount(GameEnd, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel({
          players: [lowCash, winner, highCash],
          thisPlayer: winner,
        }),
        spectator: fakeSpectatorModel(),
      },
    });

    expect((wrapper.vm as any).playersInPlace.map((player: {name: string}) => player.name)).deep.eq([
      'Winner',
      'High cash',
      'Low cash',
    ]);
  });
});
