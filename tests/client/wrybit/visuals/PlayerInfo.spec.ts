import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInfo from '@/client/wrybit/visuals/overview/PlayerInfo.vue';
import {fakePublicPlayerModel, fakeViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit player bar', () => {
  it('preserves our bot/persona/Coordination/More Parties markers and disables live timers for read-only views', async () => {
    const player = fakePublicPlayerModel({color: 'credicor', isBotControlled: true});
    const playerView = fakeViewModel({thisPlayer: undefined, players: [player], game: {gameOptions: {expansions: {conglomerates: true, moreParties: true}}}});
    const setVisibilityState = vi.fn();
    const wrapper = shallowMount(PlayerInfo, {...globalConfig, props: {player, playerView, playerIndex: 0, actionLabel: 'active', readOnly: true},
      global: {...globalConfig.global, stubs: {PlayerResources: false, PlayerStatus: false}, mocks: {getVisibilityState: () => false, setVisibilityState}}});
    try {
      expect(wrapper.get('[role="status"]').text()).eq('BOT');
      expect(wrapper.get('.player-persona-title').text()).eq('Магистр Кредикора');
      expect(wrapper.getComponent({name: 'PlayerResources'}).props('conglomeratesExpansion')).is.true;
      expect(wrapper.getComponent({name: 'PlayerAlliedParty'}).props('morePartiesExpansion')).is.true;
      expect(wrapper.getComponent({name: 'PlayerStatus'}).props('liveTimer')).is.false;
      expect(wrapper.findComponent({name: 'PlayerEloBadge'}).exists()).is.false;
      await wrapper.get('.played-cards-button').trigger('click');
      expect(setVisibilityState.mock.calls).deep.eq([['pinned_player_0', true]]);
      await wrapper.setProps({player: {...player, isBotControlled: false}});
      expect(wrapper.find('[role="status"]').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
