import {defineComponent, h, withDirectives} from 'vue';
import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {glassTooltip, tooltipPosition} from '@/client/wrybit/visuals/common/GlassTooltip';

describe('Wrybit glass tooltip', () => {
  it('clamps the tooltip and nose to the viewport edges', () => {
    expect(tooltipPosition({left: 0, width: 20}, 200, 320)).deep.eq({left: 8, noseX: 14});
    expect(tooltipPosition({left: 300, width: 20}, 200, 320)).deep.eq({left: 112, noseX: 186});
  });

  it('uses text, clears an emptied visible tooltip, and releases its portal after the last anchor leaves', async () => {
    const Anchor = defineComponent({props: {text: String}, setup: (props) => () => withDirectives(h('button', 'Hint'), [[glassTooltip, props.text]])});
    const first = mount(Anchor, {props: {text: '<img src=x onerror=alert(1)>'}, attachTo: document.body});
    const second = mount(Anchor, {props: {text: 'Other hint'}, attachTo: document.body});
    try {
      await first.get('button').trigger('mouseenter');
      const tooltip = document.querySelector('.wrybit-overlay-root .glass-tooltip')!;
      expect(tooltip.textContent).eq('<img src=x onerror=alert(1)>');
      expect(tooltip.querySelector('img')).eq(null);
      await first.setProps({text: ''});
      expect(tooltip.classList.contains('glass-tooltip--visible')).is.false;
      first.unmount();
      await second.get('button').trigger('mouseenter');
      expect(tooltip.textContent).eq('Other hint');
      second.unmount();
      expect(document.querySelector('.wrybit-overlay-root .glass-tooltip')).eq(null);
    } finally {
      first.unmount();
      second.unmount();
    }
  });
});
