import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import HelpInterface from '@/client/wrybit/pages/helpOverlay/HelpInterface.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit interface help', () => {
  it('shows the no-scroll layout tips, keyboard keys and mobile hints', () => {
    const wrapper = mount(HelpInterface, globalConfig);
    try {
      expect(wrapper.text()).contains('One screen, no page scrolling');
      expect(wrapper.text()).contains('Use the bottom tabs');
      expect(wrapper.findAll('.help-interface-card')).length(6);
      expect(wrapper.findAll('.help-interface-key')).length(14);
      expect(wrapper.text()).contains('Ctrl+Z');
    } finally {
      wrapper.unmount();
    }
  });
});
