import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import GameBoardView from '@/client/wrybit/visuals/GameBoardView.vue';
import PlanetsBoard from '@/client/wrybit/expansions/pathfinders/PlanetsBoard.vue';
import {SpaceType} from '@/common/boards/SpaceType';
import {MAXIMUM_MOON_RATE} from '@/common/constants';
import {PLANETARY_TRACKS} from '@/common/pathfinders/PlanetaryTracks';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakeGameModel} from '@tests/client/components/testHelpers';

describe('source Moon and planetary panels use our current models', () => {
  it('keeps native lunar space identifiers, station labels and refreshed rates', async () => {
    const moon = {habitatRate: 3, logisticRate: 6, miningRate: MAXIMUM_MOON_RATE,
      spaces: (['m01', 'm37', 'm02'] as const).map((id) => ({id, x: 1, y: 1, bonus: [], spaceType: id === 'm02' ? SpaceType.LAND : SpaceType.COLONY}))};
    const wrapper = shallowMount(GameBoardView, {props: {game: fakeGameModel({moon}), players: [], tileView: 'coords'},
      global: {...globalConfig.global, stubs: {MoonBoard: false, MoonSpace: true, TrackBonusChip: true, Teleport: {template: '<div><slot/></div>'},
        BoardTabs: {template: '<div><slot name="moon"/></div>'}}}});
    try {
      expect(wrapper.find('.moon-board--ring').exists()).is.true;
      expect(wrapper.findAll('.moon-ring__value')).has.length(3 * (MAXIMUM_MOON_RATE + 1));
      expect(wrapper.findAll('.moon-ring__value--active').map((cell) => cell.text())).deep.eq(['3', '6', '8']);
      const spaces = wrapper.findAll('moon-space-stub');
      expect(spaces.map((space) => space.attributes('text')).filter(Boolean)).deep.eq(['Luna Trade Station', 'Momentum Virium Habitat']);
      expect(spaces[2].attributes('tileview')).eq('coords');
      expect(wrapper.findAll('track-bonus-chip-stub')).has.length(6);
      await wrapper.setProps({game: fakeGameModel({moon: {...moon, habitatRate: 4, logisticRate: 7}})});
      expect(wrapper.findAll('.moon-ring__value--active').map((cell) => cell.text())).deep.eq(['4', '7', '8']);
    } finally {
      wrapper.unmount();
    }
  });

  it('hides unavailable planets and distinguishes native most-tags awards from track rewards', async () => {
    const paths = {venus: -1, earth: 11, mars: 0, jovian: 2, moon: -1};
    const game = fakeGameModel({pathfinders: paths});
    const wrapper = shallowMount(GameBoardView, {props: {game, players: [], tileView: 'show'},
      global: {...globalConfig.global, stubs: {PlanetsBoard: false, BoardTrackRow: {props: ['cells', 'bonuses'],
        template: '<div><slot name="value"/><slot name="sub"/></div>'}, BoardTabs: {template: '<div><slot name="paths"/></div>'}}}});
    try {
      expect(wrapper.find('.planets-board').exists()).is.true;
      expect(wrapper.find('[data-test="planet-track-venus"]').exists()).is.false;
      expect(wrapper.find('[data-test="planet-track-moon"]').exists()).is.false;
      expect(wrapper.get('[data-test="planet-track-earth"]').text()).contains('most tags');
      const earth = () => wrapper.getComponent(PlanetsBoard).vm.tracks.find((track: {key: string}) => track.key === 'earth')!;
      expect(earth().cells).has.length(PLANETARY_TRACKS.earth.spaces.length);
      expect(earth().bonuses[12][0].bonus).deep.eq({icons: ['resources/megacredit.png'], count: 3});
      expect(earth().bonuses[22][0].bonus).deep.eq({icons: ['hex_green.png']});
      expect(earth().bonuses[22]).has.length(1);
      await wrapper.setProps({game: {...game, pathfinders: {...paths, venus: 0, moon: 0},
        gameOptions: {...game.gameOptions, expansions: {...game.gameOptions.expansions, turmoil: true}}}});
      expect(wrapper.find('[data-test="planet-track-venus"]').exists()).is.true;
      expect(wrapper.find('[data-test="planet-track-moon"]').exists()).is.true;
      expect(earth().bonuses[12][0].bonus).deep.eq({icons: ['misc/delegate.png']});
    } finally {
      wrapper.unmount();
    }
  });
});
