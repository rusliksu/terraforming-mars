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
        cardName: CardName.ECOLINE,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('renders the Nereid Biosystems bespoke logo, with BIO/SYSTEMS colored separately', () => {
    const wrapper = shallowMount(CardCorporationLogo, {
      ...globalConfig,
      props: {
        cardName: CardName.NEREID_BIOSYSTEMS,
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
        cardName: CardName.PRISTAR_BETTER_MARS,
      },
    });
    expect(wrapper.find('.card-pristar-logo').exists()).to.be.true;
    expect(wrapper.text()).to.eq('PRISTAR');
  });

  for (const [cardName, selector, text] of [
    [CardName.CHEUNG_SHING_MARS_REBALANCED, '.card-cheung-shing-logo', '㨐'],
    [CardName.ECOLINE_REBALANCED, '.card-ecoline-logo', 'ECOLINE'],
    [CardName.PRISTAR_REBALANCED_BETTER_MARS, '.card-pristar-logo', 'PRISTAR'],
  ] as const) {
    it(`renders the original corporation logo for ${cardName}`, () => {
      const wrapper = shallowMount(CardCorporationLogo, {...globalConfig, props: {cardName}});
      expect(wrapper.get(selector).text()).to.eq(text);
      wrapper.unmount();
    });
  }

  it('renders The Syndicate bespoke logo, with THE/SYN/DICATE stacked horizontally', () => {
    const wrapper = shallowMount(CardCorporationLogo, {
      ...globalConfig,
      props: {
        cardName: CardName.THE_SYNDICATE,
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
        cardName: CardName.EPSILON_DAMPLE,
      },
    });
    expect(wrapper.find('.card-epsilon-dample-logo').exists()).to.be.true;
    expect(wrapper.find('.epsilon-dample-icon').attributes('src')).to.eq('assets/expansion_icons/expansion_icon_deltaProject.png');
    expect(wrapper.find('.word-1').text()).to.eq('EPSILON');
    expect(wrapper.find('.word-2').text()).to.eq('DAMPLE');
  });
});
