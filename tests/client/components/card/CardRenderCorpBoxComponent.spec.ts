import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CardRenderCorpBoxComponent from '@/client/components/card/CardRenderCorpBoxComponent.vue';

describe('CardRenderCorpBoxComponent', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(CardRenderCorpBoxComponent, {
      ...globalConfig,
      props: {
        rows: [],
        label: 'effect',
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('renders every row, not just the first', () => {
    // Regression: this used to hard-code `rows[0]`, silently dropping every row after
    // the first for any corp box with more than one stacked effect/action.
    const wrapper = shallowMount(CardRenderCorpBoxComponent, {
      ...globalConfig,
      props: {
        rows: [[], [], []],
        label: 'effect',
      },
    });
    expect(wrapper.findAll('.card-row')).to.have.lengthOf(3);
  });
});
