import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import PresentationHost from '@/client/wrybit/inputs/PresentationHost.vue';
import {createInputHosts} from '@/client/wrybit/shell/inputHosts';

describe('presentation footer host', () => {
  it('uses an existing footer, returns to its own host and releases only its target', async () => {
    const footer = document.createElement('div');
    document.body.append(footer);
    const hosts = createInputHosts();
    const wrapper = mount(PresentationHost, {attachTo: document.body, props: {hosts, target: footer}, slots: {default: '<button>Confirm</button>'}});
    try {
      expect(hosts.target.value).eq(footer);
      expect(footer.querySelector('button')?.textContent).eq('Confirm');
      await wrapper.setProps({target: undefined});
      expect(footer.childElementCount).eq(0);
      expect(hosts.target.value).eq(wrapper.get('[data-input-presentation-host]').element);
      await wrapper.setProps({target: footer});
      expect(hosts.target.value).eq(footer);
      expect(footer.querySelector('button')?.textContent).eq('Confirm');
      const replacement = document.createElement('div');
      hosts.register(replacement);
      wrapper.unmount();
      expect(hosts.target.value).eq(replacement);
    } finally {
      if (wrapper.exists()) {
        wrapper.unmount();
      }
      footer.remove();
    }
  });
});
