import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PurgeWarning from '@/client/components/common/PurgeWarning.vue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';

describe('PurgeWarning', () => {
  afterEach(() => {
    PreferencesManager.resetForTest();
    delete (window as any)._translations;
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(PurgeWarning, {
      ...globalConfig,
      props: {
        expectedPurgeTimeMs: Date.now() + 86400000,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('does not report a missing translation for the parameterized warning text', () => {
    PreferencesManager.INSTANCE.set('lang', 'ru');
    (window as any)._translations = {
      'Warning: This game will be purged in approximately ${0} hours.': 'Игра будет удалена примерно через ${0} часов.',
      'Why?': 'Почему?',
    };

    const originalConsoleLog = console.log;
    const messages: Array<string> = [];
    console.log = (...args: Array<unknown>) => {
      messages.push(args.map(String).join(' '));
    };

    try {
      shallowMount(PurgeWarning, {
        ...globalConfig,
        props: {
          expectedPurgeTimeMs: Date.now() + 86400000,
        },
      });
    } finally {
      console.log = originalConsoleLog;
    }

    expect(messages.filter((message) => message.includes('please translate'))).to.deep.eq([]);
  });
});
