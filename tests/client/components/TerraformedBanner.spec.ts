import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import TerraformedBanner from '@/client/components/TerraformedBanner.vue';
import {FakeLocalStorage} from './FakeLocalStorage';

describe('TerraformedBanner', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
  });

  it('renders a compact accessible status', () => {
    const wrapper = shallowMount(TerraformedBanner, {
      ...globalConfig,
      props: {
        playerId: 'p1',
      },
    });
    expect(wrapper.text()).to.equal('MARS✓');
    expect(wrapper.attributes('title')).to.equal('Mars is Terraformed!');
    expect(wrapper.attributes('aria-label')).to.equal('Mars is Terraformed!');
    expect(wrapper.attributes('role')).to.equal('status');
  });

  it('animates only the first show for a player', () => {
    const first = shallowMount(TerraformedBanner, {
      ...globalConfig,
      props: {playerId: 'p1'},
    });
    const repeat = shallowMount(TerraformedBanner, {
      ...globalConfig,
      props: {playerId: 'p1'},
    });

    expect(first.classes()).to.include('terraformed-banner--animated');
    expect(repeat.classes()).to.not.include('terraformed-banner--animated');
  });
});
