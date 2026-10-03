import {mount, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CardTags from '@/client/components/card/CardTags.vue';
import {Tag} from '@/common/cards/Tag';

describe('CardTags', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(CardTags, {
      ...globalConfig,
      props: {
        tags: [Tag.SPACE, Tag.SCIENCE],
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('renders one tag icon per printed tag', () => {
    const wrapper = mount(CardTags, {
      ...globalConfig,
      props: {
        tags: [Tag.SPACE, Tag.SCIENCE],
      },
    });
    expect(wrapper.findAll('.card-tag')).to.have.lengthOf(2);
  });

  it('falls back to the asterisk overflow tag once there are more than 4 tags', () => {
    const wrapper = mount(CardTags, {
      ...globalConfig,
      props: {
        tags: [Tag.SPACE, Tag.SCIENCE, Tag.EARTH, Tag.BUILDING, Tag.ANIMAL],
      },
    });
    expect(wrapper.findAll('.card-tag')).to.have.lengthOf(1);
    expect(wrapper.find('.tag-asterisk').exists()).to.be.true;
  });
});
