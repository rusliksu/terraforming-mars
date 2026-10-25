import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import CanonicalPanel from '@/client/components/logpanel/CardPanel.vue';
import CanonicalCard from '@/client/components/card/Card.vue';
import WrybitPanel from '@/client/wrybit/visuals/logpanel/CardPanel.vue';
import WrybitCard from '@/client/wrybit/visuals/card/Card.vue';
import LogMessageInspector from '@/client/wrybit/visuals/logpanel/LogMessageInspector.vue';
import {fakePublicPlayerModel, fakeViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {CardName} from '@/common/cards/CardName';

describe('Shared public log preview model', () => {
  it('Escape releases a pinned modal and its global dismissal listener', async () => {
    const message = new LogMessage(LogMessageType.DEFAULT, '${0}', [{type: LogMessageDataType.CARD, value: CardName.ASTEROID}]);
    const wrapper = mount(LogMessageInspector, {...globalConfig, props: {viewModel: fakeViewModel()}});
    try {
      wrapper.vm.pinPreview(message, undefined);
      await wrapper.vm.$nextTick();
      expect(document.body.querySelector('.wrybit-ui .card-panel--modal')).not.eq(null);
      window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      await wrapper.vm.$nextTick();
      expect(document.body.querySelector('.wrybit-ui .card-panel--modal')).eq(null);
      expect(wrapper.emitted('pinnedClosed')).length(1);
      window.dispatchEvent(new Event('pointerdown'));
      expect(wrapper.emitted('pinnedClosed')).length(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('both presentations retain tableau resources and Self-Replicating Robots state on refresh', async () => {
    const message = new LogMessage(LogMessageType.DEFAULT, '${0}', [{type: LogMessageDataType.CARDS, value: [CardName.ANTS, CardName.ASTEROID]}]);
    const players = [fakePublicPlayerModel({tableau: [{name: CardName.ANTS, resources: 4}],
      selfReplicatingRobotsCards: [{name: CardName.ASTEROID, resources: 5}]})];
    for (const [Panel, Card] of [[CanonicalPanel, CanonicalCard], [WrybitPanel, WrybitCard]] as const) {
      const wrapper = mount(Panel, {...globalConfig, props: {message, players}});
      try {
        const cards = wrapper.findAllComponents(Card);
        expect(cards[0].props('card')).deep.eq({name: CardName.ANTS, resources: 4, isSelfReplicatingRobotsCard: false});
        expect(cards[1].props('card')).deep.eq({name: CardName.ASTEROID, resources: 5, isSelfReplicatingRobotsCard: true});
        await wrapper.setProps({players: [{...players[0], tableau: [{name: CardName.ANTS, resources: 9}]}]});
        expect(wrapper.findAllComponents(Card)[0].props('card').resources).eq(9);
      } finally {
        wrapper.unmount();
      }
    }
  });
});
