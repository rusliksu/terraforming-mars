import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import TopBar from '@/client/components/TopBar.vue';
import {fakePlayerViewModel} from './testHelpers';

describe('TopBar', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(TopBar, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel(),
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('always renders the top bar and no longer shows the arrow collapser', () => {
    const wrapper = shallowMount(TopBar, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel(),
      },
    });

    expect(wrapper.find('.top-bar-collapser').exists()).to.be.false;
    expect(wrapper.classes()).to.not.include('top-bar-collapsed');
    expect(wrapper.findComponent({name: 'PlayerInfo'}).exists()).to.be.true;
  });
});
