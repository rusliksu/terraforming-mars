import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import ColonySpace from '@/client/components/colonies/ColonySpace.vue';
import {ColonyName} from '@/common/colonies/ColonyName';
import {getColonyOrThrow} from '@/client/colonies/ClientColonyManifest';

describe('ColonySpace', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(ColonySpace, {
      ...globalConfig,
      props: {
        idx: 0,
        metadata: getColonyOrThrow(ColonyName.GANYMEDE),
        player: undefined,
        marker: false,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('adds persona cube styling for reserved player colors', () => {
    const wrapper = shallowMount(ColonySpace, {
      ...globalConfig,
      props: {
        idx: 1,
        metadata: getColonyOrThrow(ColonyName.GANYMEDE),
        player: 'gambit',
        marker: false,
      },
    });

    expect(wrapper.find('.colony-cube').classes()).to.include('board-cube--persona');
  });
});
