import {mount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import MoonSpace from '@/client/components/moon/MoonSpace.vue';

describe('MoonSpace', () => {
  it('has visible tile', async () => {
    const wrapper = mount(MoonSpace, {
      ...globalConfig,
      props: {
        space: {id: 'm1', bonus: [], spaceType: 'land', color: undefined, tileType: undefined},
      },
    });

    expect(wrapper.find('[data-test="tile"]').classes()).to.not.contain('board-hidden-tile');
  });

  it('has hidden tile if hidden props is passed', async () => {
    const wrapper = mount(MoonSpace, {
      ...globalConfig,
      props: {
        space: {id: 'm1', bonus: [], spaceType: 'land', color: undefined, tileType: undefined},
        tileView: 'hide',
      },
    });

    expect(wrapper.find('[data-test="tile"]').classes()).to.contain('board-hidden-tile');
  });

  it('adds a persona cube class for reserved player colors on the moon board', async () => {
    const wrapper = mount(MoonSpace, {
      ...globalConfig,
      props: {
        space: {id: 'm1', bonus: [], spaceType: 'land', color: 'gold', tileType: undefined},
      },
    });

    expect(wrapper.find('.board-cube').classes()).to.include('board-cube--persona');
  });

  it('adds a persona cube class for reserved co-owner colors on the moon board', async () => {
    const wrapper = mount(MoonSpace, {
      ...globalConfig,
      props: {
        space: {id: 'm1', bonus: [], spaceType: 'land', coOwner: 'gold', tileType: undefined},
      },
    });

    expect(wrapper.find('.board-cube-coOwner').classes()).to.include('board-cube--persona');
  });
});
