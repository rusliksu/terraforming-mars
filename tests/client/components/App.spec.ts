import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {paths} from '@/common/app/paths';
import {statusCode} from '@/common/http/statusCode';
import App from '@/client/components/App.vue';
import {getLoadErrorMessage} from '@/client/utils/loadErrorMessage';
import {globalConfig} from './getLocalVue';

describe('App', () => {
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
});
