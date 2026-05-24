import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {paths} from '@/common/app/paths';
import {statusCode} from '@/common/http/statusCode';
import App from '@/client/components/App.vue';
import {getLoadErrorMessage} from '@/client/utils/loadErrorMessage';
import {globalConfig} from './getLocalVue';
import {fakePlayerViewModel} from './testHelpers';

describe('App', () => {
  let originalFetch: typeof fetch;
  let originalUrl: string;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalUrl = window.location.href;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.replaceState({}, '', originalUrl);
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(App, globalConfig);
    expect(wrapper.exists()).to.be.true;
  });

  it('shows a specific message for stale game links', () => {
    expect(getLoadErrorMessage(paths.GAME, statusCode.notFound)).contains('Game not found');
  });

  it('keeps the generic message for other load failures', () => {
    expect(getLoadErrorMessage(paths.GAME, statusCode.internalServerError)).eq('Error getting game data');
  });

  it('keeps generated player password in the player URL after first access', async () => {
    window.history.replaceState({}, '', '/player?id=p-blue-id');
    global.fetch = async (url: unknown) => {
      expect(String(url)).eq('api/player?id=p-blue-id');
      return {
        ok: true,
        json: async () => fakePlayerViewModel({
          id: 'p-blue-id' as any,
          password: 'secret-password',
        }),
      } as Response;
    };

    shallowMount(App, globalConfig);
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(window.location.pathname + window.location.search).eq('/player?id=p-blue-id&password=secret-password');
  });

  it('shows a password-specific message for protected player links', () => {
    expect(getLoadErrorMessage(paths.PLAYER, statusCode.forbidden)).contains('password');
  });
});
