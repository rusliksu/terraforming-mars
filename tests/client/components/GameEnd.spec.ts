import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import GameEnd from '@/client/components/GameEnd.vue';
import {fakePlayerViewModel, fakeSpectatorModel} from './testHelpers';

describe('GameEnd', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(GameEnd, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel(),
        spectator: fakeSpectatorModel(),
      },
    });
    expect(wrapper.exists()).to.be.true;
    expect(wrapper.text()).to.contain('Rematch (same setup)');
    expect(wrapper.text()).not.to.contain('Spectator:');
    const rematchLink = wrapper.findAll('a').find((link) => link.text().includes('Rematch (same setup)'));
    expect(rematchLink).to.not.be.undefined;
    expect(rematchLink?.attributes('title')).to.eq('Start a new game with the same initial setup');
    expect(rematchLink?.attributes('href')).to.contain('new-game?cloneGameId=');
  });
});
