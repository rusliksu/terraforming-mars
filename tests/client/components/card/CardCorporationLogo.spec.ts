import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CardCorporationLogo from '@/client/components/card/CardCorporationLogo.vue';
import {CardName} from '@/common/cards/CardName';

describe('CardCorporationLogo', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(CardCorporationLogo, {
      ...globalConfig,
      props: {
        title: CardName.ECOLINE,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('renders the Nereid Biosystems bespoke logo, with BIO/SYSTEMS colored separately', () => {
    const wrapper = shallowMount(CardCorporationLogo, {
      ...globalConfig,
      props: {
        title: CardName.NEREID_BIOSYSTEMS,
      },
    });
    expect(wrapper.find('.card-nereid-biosystems-logo').exists()).to.be.true;
    expect(wrapper.find('.word-1').text()).to.eq('NEREID');
    expect(wrapper.find('.word-2').text()).to.eq('BIOSYSTEMS');
    expect(wrapper.find('.bio').text()).to.eq('BIO');
    expect(wrapper.find('.systems').text()).to.eq('SYSTEMS');
  });

  it('renders Pristar:bm with the same logo class as Pristar', () => {
    const wrapper = shallowMount(CardCorporationLogo, {
      ...globalConfig,
      props: {
        title: CardName.PRISTAR_BETTER_MARS,
      },
    });
    expect(wrapper.find('.card-pristar-logo').exists()).to.be.true;
    expect(wrapper.text()).to.eq('PRISTAR');
  });

  it('renders The Syndicate bespoke logo, with THE/SYN/DICATE stacked horizontally', () => {
    const wrapper = shallowMount(CardCorporationLogo, {
      ...globalConfig,
      props: {
        title: CardName.THE_SYNDICATE,
      },
    });
    expect(wrapper.find('.card-the-syndicate-logo').exists()).to.be.true;
    expect(wrapper.find('.word-1').text()).to.eq('THE');
    expect(wrapper.find('.word-1b').text()).to.eq('SYN');
    expect(wrapper.find('.word-2').text()).to.eq('DICATE');
  });

  it('renders Epsilon Dample bespoke logo, with the Delta Project chevron icon', () => {
    const wrapper = shallowMount(CardCorporationLogo, {
      ...globalConfig,
      props: {
        title: CardName.EPSILON_DAMPLE,
      },
    });
    expect(wrapper.find('.card-epsilon-dample-logo').exists()).to.be.true;
    expect(wrapper.find('.epsilon-dample-icon').attributes('src')).to.eq('assets/expansion_icons/expansion_icon_deltaProject.png');
    expect(wrapper.find('.word-1').text()).to.eq('EPSILON');
    expect(wrapper.find('.word-2').text()).to.eq('DAMPLE');
  });
});
