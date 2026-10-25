import {mount, flushPromises} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import {reactive} from 'vue';
import PlayersOverview from '@/client/wrybit/visuals/overview/PlayersOverview.vue';
import {fakePublicPlayerModel, fakeViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {Phase} from '@/common/Phase';
import {CardName} from '@/common/cards/CardName';
import type {PlayersTableRowModel} from '@/client/wrybit/visuals/overview/playersTableLayout';

describe('Wrybit players overview with our controllers', () => {
  it('keeps recorded views read-only, player order and own played-card visibility under our root', async () => {
    const first = fakePublicPlayerModel({color: 'red', tableau: [{name: CardName.HELION}]});
    const second = fakePublicPlayerModel({color: 'blue'});
    const third = fakePublicPlayerModel({color: 'yellow'});
    const view = fakeViewModel({thisPlayer: first, players: [first, second, third]});
    view.game.phase = Phase.END;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const visibility = reactive<Record<string, boolean>>({});
    const wrapper = mount(PlayersOverview, {...globalConfig, attachTo: document.body, props: {playerView: view, readOnly: true},
      global: {...globalConfig.global, mocks: {
        getVisibilityState: (key: string) => visibility[key] === true,
        setVisibilityState: (key: string, visible: boolean) => {
          visibility[key] = visible;
        },
        componentsVisibility: {tags_concise: false},
      }}});
    try {
      await flushPromises();
      expect(fetchMock.mock.calls).has.length(0);
      expect(wrapper.vm.tableRows.map((row: PlayersTableRowModel) => row.player.color)).deep.eq(['blue', 'yellow', 'red']);
      expect(wrapper.find('.player-elo-badge').exists()).is.false;
      const infos = wrapper.findAll('.player-info');
      await infos[2].get('.played-cards-button').trigger('click');
      expect(visibility).deep.eq({pinned_player_0: false, pinned_player_1: false, pinned_player_2: true});
      expect(wrapper.findAll('.other_player_panel').filter((panel) => panel.isVisible())).has.length(1);
      await infos[0].get('.played-cards-button').trigger('click');
      expect(visibility).deep.eq({pinned_player_0: true, pinned_player_1: false, pinned_player_2: false});
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
    }
  });
});
