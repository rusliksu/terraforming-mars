import {mount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import MoonSpace from '@/client/components/moon/MoonSpace.vue';
import {SpaceType} from '@/common/boards/SpaceType';

describe('MoonSpace', () => {
  it('has visible tile', async () => {
    const wrapper = mount(MoonSpace, {
      ...globalConfig,
      props: {
        space: {
          id: 'm01',
          bonus: [],
          x: 0,
          y: 0,
          spaceType: SpaceType.LAND,
        },
      },
    });

    expect(wrapper.find('[data-test="tile"]').classes()).to.not.contain('board-hidden-tile');
  });

  it('has hidden tile if hidden props is passed', async () => {
    const wrapper = mount(MoonSpace, {
      ...globalConfig,
      props: {
        space: {
          id: 'm01',
          bonus: [],
          x: 0,
          y: 0,
          spaceType: SpaceType.LAND,
        },
        tileView: 'hide',
      },
    });

    expect(wrapper.find('[data-test="tile"]').classes()).to.contain('board-hidden-tile');
  });

  it('adds a persona cube class for reserved player colors on the moon board', async () => {
    const wrapper = mount(MoonSpace, {
      ...globalConfig,
      props: {
        space: {id: 'm01', bonus: [], x: 0, y: 0, spaceType: SpaceType.LAND, color: 'gold', tileType: undefined},
      },
    });

    expect(wrapper.find('.board-cube').classes()).to.include('board-cube--persona');
  });

  it('adds a persona cube class for reserved co-owner colors on the moon board', async () => {
    const wrapper = mount(MoonSpace, {
      ...globalConfig,
      props: {
        space: {id: 'm01', bonus: [], x: 0, y: 0, spaceType: SpaceType.LAND, coOwner: 'gold', tileType: undefined},
      },
    });

    expect(wrapper.find('.board-cube-coOwner').classes()).to.include('board-cube--persona');
  });
});
