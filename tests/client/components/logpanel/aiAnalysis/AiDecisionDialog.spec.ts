import {mount} from '@vue/test-utils';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {expect} from 'chai';
import AiDecisionDialog from '@/client/components/logpanel/aiAnalysis/AiDecisionDialog.vue';
import {aiFeedbackState, closeAiDecision, openAiDecision} from '@/client/components/logpanel/aiAnalysis/aiFeedbackState';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {AiDecisionSummary} from '@/common/ai/AiDecisionSummary';

const summary: AiDecisionSummary = {
  id: 'g1:1',
  kind: 'action',
  title: 'Take your next action',
  saveId: 3,
  generation: 1,
  options: [
    {index: 0, label: 'Algae', card: 'Algae', value: 3, chosen: true},
    {index: 1, label: 'Ants', card: 'Ants', value: 2, chosen: false},
  ],
};

function open(): void {
  const line = new LogMessage(LogMessageType.DEFAULT, 'AI played ${0}', [{type: undefined, value: 'Algae'} as any]);
  line.id = '4.c';
  line.aiInsight = 'red';
  line.aiDecisionId = summary.id;
  openAiDecision({message: line, messageId: '4.c', decisionId: summary.id, color: 'red'}, summary, {id: 'p-red'} as any, 'up');
}

describe('AiDecisionDialog', () => {
  afterEach(() => {
    closeAiDecision();
    (window as any).fetch = undefined;
  });

  it('shows the AI line, its options and saves a rating', async () => {
    let posted: any;
    (window as any).fetch = async (url: string, init: any) => {
      posted = {url, body: JSON.parse(init.body)};
      return {ok: true, json: async () => []};
    };
    aiFeedbackState.participantId = 'p-red';
    open();
    const wrapper = mount(AiDecisionDialog, {...globalConfig});
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test=ai-decision-options]').text()).include('Algae');
    expect(wrapper.find('[data-test=ai-decision-options]').text()).include('✓');
    await wrapper.find('[data-test=ai-rating-down]').trigger('click');
    await wrapper.find('[data-test=ai-save]').trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(posted.url).include('api/ai-feedback?id=p-red');
    expect(posted.body.messageId).eq('4.c');
    expect(posted.body.rating).eq('down');
  });

  it('renders nothing without an open dialog', () => {
    const wrapper = mount(AiDecisionDialog, {...globalConfig});
    expect(wrapper.find('[data-test=ai-decision-dialog]').exists()).is.false;
  });
});
