import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '@tests/client/components/getLocalVue';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';

function message(text: string, aiInsight?: 'red' | 'green'): LogMessage {
  const m = new LogMessage(LogMessageType.DEFAULT, text, []);
  if (aiInsight !== undefined) {
    m.id = '1.a';
    m.aiInsight = aiInsight;
  }
  return m;
}

const viewModel = {game: {spaces: []}} as any;

describe('LogMessageComponent AI rating bar', () => {
  it('offers the ratings on AI analysis lines only', () => {
    expect(mount(LogMessageComponent, {...globalConfig, props: {message: message('ai', 'red'), viewModel}}).find('[data-test=ai-log-rate-bar]').exists()).is.true;
    expect(mount(LogMessageComponent, {...globalConfig, props: {message: message('plain'), viewModel}}).find('[data-test=ai-log-rate-bar]').exists()).is.false;
  });

  it('emits the picked rating', async () => {
    const wrapper = mount(LogMessageComponent, {...globalConfig, props: {message: message('ai', 'red'), viewModel}});
    await wrapper.find('[data-test=ai-rate-up]').trigger('click');
    expect(wrapper.emitted('aiRate')?.[0]).deep.eq(['up']);
  });
});
