import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PurgeWarning from '@/client/components/common/PurgeWarning.vue';

describe('PurgeWarning', () => {
  const nowMs = 1_000_000_000;
  let originalDateNow: () => number;

  beforeEach(() => {
    originalDateNow = Date.now;
    Date.now = () => nowMs;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(PurgeWarning, {
      ...globalConfig,
      props: {
        expectedPurgeTimeMs: nowMs + 86400000,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows remaining hours for future purge times', () => {
    const wrapper = shallowMount(PurgeWarning, {
      ...globalConfig,
      props: {
        expectedPurgeTimeMs: nowMs + 86400000,
      },
    });

    expect(wrapper.text()).contains('approximately 24 hours');
  });

  it('does not show anything when no purge time is set', () => {
    const wrapper = shallowMount(PurgeWarning, {
      ...globalConfig,
      props: {
        expectedPurgeTimeMs: 0,
      },
    });

    expect(wrapper.text()).eq('');
  });

  it('does not show negative hours for past purge times', () => {
    const wrapper = shallowMount(PurgeWarning, {
      ...globalConfig,
      props: {
        expectedPurgeTimeMs: nowMs - 3600000,
      },
    });

    expect(wrapper.text()).contains('past its expected purge time');
    expect(wrapper.text()).not.contains('-1 hours');
  });
});
