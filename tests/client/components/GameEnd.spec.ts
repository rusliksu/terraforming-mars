import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import GameEnd from '@/client/components/GameEnd.vue';
import {fakePlayerViewModel, fakePublicPlayerModel, fakeGameModel} from './testHelpers';
import {ConglomeratesTeamModel} from '@/common/models/ConglomeratesModel';

describe('GameEnd', () => {
  it('links to the replay with spectator access from a player results page', () => {
    const playerView = fakePlayerViewModel();
    playerView.game.spectatorId = 'sreplay-link';
    const wrapper = shallowMount(GameEnd, {...globalConfig, props: {participant: playerView}});
    expect(wrapper.get('a[href^="replay?"]').attributes('href')).eq('replay?id=sreplay-link');
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(GameEnd, {
      ...globalConfig,
      props: {
        participant: fakePlayerViewModel(),
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

  it('places surrendered players in a shared remaining-place range and marks them', () => {
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
        participant: fakePlayerViewModel({
          players: [surrendered, winner],
          thisPlayer: winner,
        }),
      },
    });

    expect((wrapper.vm as any).playersInPlace.map((player: {name: string}) => player.name)).deep.eq(['Winner', 'Surrendered']);
    expect((wrapper.vm as any).getPlayerPlaceLabel(winner)).eq('1');
    expect((wrapper.vm as any).getPlayerPlaceLabel(surrendered)).eq('2');
    const flag = wrapper.find('[data-test="surrendered-player-flag"]');
    expect(flag.exists()).eq(true);
    expect(flag.attributes('title')).eq('Surrendered');
    expect(wrapper.find('.bot-controlled-marker').exists()).eq(true);
    expect(wrapper.text()).not.to.contain('Left');
  });

  it('ties all surrendered players across the remaining places', () => {
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
        participant: fakePlayerViewModel({
          players: [lowCash, winner, highCash],
          thisPlayer: winner,
        }),
      },
    });

    expect((wrapper.vm as any).playersInPlace.map((player: {name: string}) => player.name)).deep.eq(['Winner', 'Low cash', 'High cash']);
    expect((wrapper.vm as any).getPlayerPlaceLabel(winner)).eq('1');
    expect((wrapper.vm as any).getPlayerPlaceLabel(lowCash)).eq('2–3');
    expect((wrapper.vm as any).getPlayerPlaceLabel(highCash)).eq('2–3');
    expect(wrapper.findAll('[data-test="result-place"]').map((cell) => cell.text())).deep.eq(['1', '2–3', '2–3']);
  });

  it('explains where every end-game navigation entry leads', () => {
    const playerView = fakePlayerViewModel();
    playerView.game.spectatorId = 'sreplay-link';
    const wrapper = shallowMount(GameEnd, {...globalConfig, props: {participant: playerView}});

    const tooltipFor = (text: string) => wrapper.findAll('a')
      .find((link) => link.text().includes(text))?.attributes('data-tooltip');

    expect(tooltipFor('Game replay')).eq('Watch the saved states of this game');
    expect(tooltipFor('Create New Game')).eq('Start a new game and invite the other players');
    expect(tooltipFor('Rematch (same setup)')).eq('Open a new lobby with the same settings');
    expect(tooltipFor('Go to main page')).eq('Main menu: start a game or open the guides');
    expect(tooltipFor('Elo & History')).eq('Elo ratings and finished games');

    // The entries explain themselves through tooltips; no extra plaque on the page.
    expect(wrapper.find('[data-test="end-game-navigation-hint"]').exists()).is.false;
    expect(wrapper.find('.game-end-navigation-hint').exists()).is.false;
  });

  it('ranks players by their team\'s combined score in a Conglomerates game, not their own individual total', () => {
    // Red has the highest INDIVIDUAL total (10), but red+yellow's team total (13) is lower
    // than blue+green's (16) -- milestone/award VP is team-only, so ranking must go by team.
    const players = [
      fakePublicPlayerModel({color: 'red', victoryPointsBreakdown: {total: 10}, megacredits: 0}),
      fakePublicPlayerModel({color: 'blue', victoryPointsBreakdown: {total: 5}, megacredits: 0}),
      fakePublicPlayerModel({color: 'yellow', victoryPointsBreakdown: {total: 3}, megacredits: 0}),
      fakePublicPlayerModel({color: 'green', victoryPointsBreakdown: {total: 3}, megacredits: 0}),
    ];
    const teamA: ConglomeratesTeamModel = {
      id: 'team-1', playerIds: [], playerColors: ['red', 'yellow'], teamColor: 'orange',
      memberScores: [10, 3], name: 'Team A',
      victoryPoints: {players: 13, milestones: 0, awards: 0, bonuses: 0, total: 13},
    };
    const teamB: ConglomeratesTeamModel = {
      id: 'team-2', playerIds: [], playerColors: ['blue', 'green'], teamColor: 'purple',
      memberScores: [5, 3], name: 'Team B',
      victoryPoints: {players: 8, milestones: 8, awards: 0, bonuses: 0, total: 16},
    };
    const wrapper = shallowMount(GameEnd, {
      ...globalConfig,
      props: {
        participant: fakePlayerViewModel({
          players,
          game: fakeGameModel({conglomerates: {teams: [teamA, teamB]}}),
        }),
      },
    });

    const vm = wrapper.vm as any;
    expect(vm.winners.map((p: any) => p.color)).to.have.members(['blue', 'green']);
  });
});
