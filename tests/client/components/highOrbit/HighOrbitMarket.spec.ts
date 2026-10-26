import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import HighOrbitMarket from '@/client/components/highOrbit/HighOrbitMarket.vue';
import {CardName} from '@/common/cards/CardName';

describe('HighOrbitMarket', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(HighOrbitMarket, {
      ...globalConfig,
      props: {
        market: [
          {locked: false, slots: [CardName.SPACE_TRADING_STATION, undefined, undefined, undefined, undefined]},
          {locked: true, slots: [undefined, undefined, undefined, undefined, undefined]},
          {locked: false, slots: [undefined, undefined, undefined, undefined, undefined]},
        ],
      },
    });
    expect(wrapper.exists()).to.be.true;
  });
});
