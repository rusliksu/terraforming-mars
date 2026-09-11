import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import StartScreen from '@/client/components/StartScreen.vue';

describe('StartScreen', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(StartScreen, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('hints that a new game starts from a shared lobby link', () => {
    const wrapper = shallowMount(StartScreen, {
      ...globalConfig,
    });

    const newGame = wrapper.findAll('a').find((link) => link.text().includes('New game'));
    expect(newGame).to.not.be.undefined;
    expect(newGame?.attributes('href')).eq('new-game');
    expect(newGame?.attributes('title')).eq('Create a game, then share its lobby link with the other players');
  });
});
