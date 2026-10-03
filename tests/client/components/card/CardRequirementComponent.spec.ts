import {shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import CardRequirementComponent from '@/client/components/card/CardRequirementComponent.vue';
import {Tag} from '@/common/cards/Tag';
import {Resource} from '@/common/Resource';

describe('CardRequirementComponent', () => {
  it('renders temperature requirement', () => {
    const wrapper = shallowMount(CardRequirementComponent, {
      ...globalConfig,
      props: {
        requirement: {temperature: -14, count: -14},
      },
    });
    expect(wrapper.text()).to.include('-14');
    expect(wrapper.find('.card-temperature--req').exists()).to.be.true;
  });

  it('renders tag requirement', () => {
    const wrapper = shallowMount(CardRequirementComponent, {
      ...globalConfig,
      props: {
        requirement: {tag: Tag.SCIENCE, count: 2},
      },
    });
    expect(wrapper.find('.tag-science').exists()).to.be.true;
  });

  it('renders a production requirement', () => {
    const wrapper = shallowMount(CardRequirementComponent, {
      ...globalConfig,
      props: {
        requirement: {production: Resource.TITANIUM, count: 2},
      },
    });
    expect(wrapper.find('.card-resource-titanium').exists()).to.be.true;
  });

  it('renders a plants production requirement with the singular plant icon class', () => {
    // Regression: Resource.PLANTS is 'plants', but the icon CSS class is the singular
    // 'card-resource-plant' (shared with every other plant-resource icon in the app) —
    // naively interpolating the resource value produces a nonexistent 'card-resource-plants'
    // class, rendering as a blank grey box.
    const wrapper = shallowMount(CardRequirementComponent, {
      ...globalConfig,
      props: {
        requirement: {production: Resource.PLANTS, count: 2},
      },
    });
    expect(wrapper.find('.card-resource-plant').exists()).to.be.true;
    expect(wrapper.find('.card-resource-plants').exists()).to.be.false;
  });

  it('renders a greenery-last-action requirement as a greenery tile plus an asterisk', () => {
    const wrapper = shallowMount(CardRequirementComponent, {
      ...globalConfig,
      props: {
        requirement: {greeneryLastAction: true},
      },
    });
    expect(wrapper.find('.greenery-tile').exists()).to.be.true;
    expect(wrapper.find('.card-asterix').exists()).to.be.true;
  });

  it('renders a slash between two adjacent-greeneries requirement icons', () => {
    const wrapper = shallowMount(CardRequirementComponent, {
      ...globalConfig,
      props: {
        requirement: {greeneries: 2, adjacent: true, count: 2},
      },
    });
    expect(wrapper.findAll('.greenery-tile')).to.have.length(2);
    expect(wrapper.find('.card-slash').exists()).to.be.true;
  });

  it('does not render a slash for a plain (non-adjacent) 2-greeneries requirement', () => {
    const wrapper = shallowMount(CardRequirementComponent, {
      ...globalConfig,
      props: {
        requirement: {greeneries: 2, count: 2},
      },
    });
    expect(wrapper.findAll('.greenery-tile')).to.have.length(2);
    expect(wrapper.find('.card-slash').exists()).to.be.false;
  });
});
