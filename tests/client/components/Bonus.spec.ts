import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '@tests/client/components/getLocalVue';
import Bonus from '@/client/components/Bonus.vue';
import {SpaceBonus} from '@/common/boards/SpaceBonus';

describe('Bonus', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(Bonus, {
      ...globalConfig,
      props: {
        bonus: [SpaceBonus.STEEL],
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('renders one icon per bonus for non-M€ types, no count badge', () => {
    const wrapper = shallowMount(Bonus, {
      ...globalConfig,
      props: {
        bonus: [SpaceBonus.STEEL, SpaceBonus.TITANIUM],
      },
    });
    const icons = wrapper.findAll('i.board-space-bonus');
    expect(icons.length).to.eq(2);
    expect(wrapper.find('.board-space-bonus-count').exists()).to.be.false;
  });

  it('collapses repeated M€ bonuses into a single icon with a count badge', () => {
    const wrapper = shallowMount(Bonus, {
      ...globalConfig,
      props: {
        bonus: [SpaceBonus.MEGACREDITS, SpaceBonus.MEGACREDITS, SpaceBonus.MEGACREDITS],
      },
    });
    const icons = wrapper.findAll('i.board-space-bonus');
    expect(icons.length).to.eq(1);
    expect(icons[0].classes()).to.include('board-space-bonus--megacredit');
    expect(wrapper.find('.board-space-bonus-count').text()).to.eq('3');
  });

  it('shows "1" on the coin for a single M€ bonus too (the icon itself is blank)', () => {
    const wrapper = shallowMount(Bonus, {
      ...globalConfig,
      props: {
        bonus: [SpaceBonus.MEGACREDITS],
      },
    });
    expect(wrapper.find('.board-space-bonus-count').text()).to.eq('1');
  });

  it('keeps every bonus on the tile (computed grid) once there are more than 3', () => {
    const wrapper = shallowMount(Bonus, {
      ...globalConfig,
      props: {
        bonus: [SpaceBonus.STEEL, SpaceBonus.TITANIUM, SpaceBonus.PLANT, SpaceBonus.HEAT, SpaceBonus.ENERGY],
      },
    });
    const icons = wrapper.findAll('i.board-space-bonus');
    expect(icons.length).to.eq(5);
    icons.forEach((icon) => {
      expect(icon.classes()).to.include('board-space-bonus-pos--grid');
      expect(icon.classes()).to.include('board-space-bonus--compact');
      // Each icon must have an explicit position so it can't fall back to the
      // default top-left margin (which is how bonuses used to run off the tile).
      const style = icon.attributes('style') ?? '';
      expect(style).to.match(/left:/);
      expect(style).to.match(/top:/);
    });
  });
});
