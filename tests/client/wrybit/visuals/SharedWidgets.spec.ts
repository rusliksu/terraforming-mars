import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import KeyboardShortcuts from '@/client/wrybit/visuals/KeyboardShortcuts.vue';
import Party from '@/client/wrybit/visuals/Party.vue';
import {PartyName} from '@/common/turmoil/PartyName';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit shared visual widgets', () => {
  it('shows our actual colony shortcut and closes through the canonical popup event', async () => {
    const wrapper = mount(KeyboardShortcuts, globalConfig);
    try {
      expect(wrapper.text()).contains('F - Colonies');
      expect(wrapper.text()).not.contains('G - Colonies');
      await wrapper.get('.close-button').trigger('click');
      expect(wrapper.emitted('close')).has.length(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('renders public party counts with the source background and our canonical availability state', () => {
    const wrapper = mount(Party, {...globalConfig, props: {party: {name: PartyName.GREENS, partyLeader: 'red',
      delegates: [{color: 'blue', number: 2}]}, isAvailable: false, isDominant: true}});
    try {
      expect(wrapper.classes()).contains('party-background--greens');
      expect(wrapper.classes()).contains('unavailable-party');
      expect(wrapper.find('.dominance-marker').exists()).is.true;
      expect(wrapper.get('.count-in-send-delegate').text()).eq('2');
    } finally {
      wrapper.unmount();
    }
  });
});
