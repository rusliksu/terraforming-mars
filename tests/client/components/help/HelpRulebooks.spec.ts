import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import HelpRulebooks from '@/client/components/help/HelpRulebooks.vue';
import {EXPANSIONS} from '@/common/cards/GameModule';

describe('HelpRulebooks', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(HelpRulebooks, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('lists every expansion (official and fan alike), so a new one is never silently missing', () => {
    const wrapper = shallowMount(HelpRulebooks, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    const listedModules: Array<string> = [...vm.officialExpansions, ...vm.fanExpansions].map((entry: {module: string}) => entry.module);

    for (const expansion of EXPANSIONS) {
      expect(listedModules, expansion).to.include(expansion);
    }
  });
});
