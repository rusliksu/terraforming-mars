import {expect} from 'chai';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {AiDecisionSummary} from '@/common/ai/AiDecisionSummary';
import {aiFeedbackState, closeAiDecision, decisionSummaries, openAiDecision, openAiDecisionIndex, stepAiDecision, targetOf} from '@/client/components/logpanel/aiAnalysis/aiFeedbackState';

function message(text: string): LogMessage {
  return new LogMessage(LogMessageType.DEFAULT, text, []);
}

const summary: AiDecisionSummary = {
  id: 'g1:1',
  kind: 'action',
  title: 'Take your next action',
  saveId: 3,
  generation: 1,
  options: [{index: 0, label: 'Algae', card: 'Algae', value: 3, chosen: true}],
};

describe('aiFeedbackState', () => {
  afterEach(() => closeAiDecision());

  it('targets only AI analysis lines with a stable id', () => {
    const plain = message('plain');
    expect(targetOf(plain)).is.undefined;

    const hidden = message('private human line');
    hidden.id = '1.a';
    expect(targetOf(hidden)).is.undefined;

    const ai = message('AI line');
    ai.id = '2.b';
    ai.aiInsight = 'red';
    ai.aiDecisionId = 'g1:1';
    expect(targetOf(ai)).deep.eq({message: ai, messageId: '2.b', decisionId: 'g1:1', color: 'red'});
  });

  it('collects decision summaries from the first line only', () => {
    const first = message('first');
    first.aiDecision = summary;
    const second = message('second');
    second.aiDecisionId = summary.id;

    const summaries = decisionSummaries([first, second]);
    expect([...summaries.keys()]).deep.eq([summary.id]);
    expect(summaries.get(summary.id)).eq(summary);
  });

  it('steps between AI rows and stops at the ends', () => {
    const first = message('first');
    first.id = '1.a';
    first.aiInsight = 'red';
    first.aiDecisionId = summary.id;
    first.aiDecision = summary;
    const second = message('second');
    second.id = '2.b';
    second.aiInsight = 'green';
    const targets = [targetOf(first)!, targetOf(second)!];
    const summaries = decisionSummaries([first]);

    openAiDecision(targets[0], summary, {id: 'p-red'} as any, undefined, targets, summaries);
    expect(openAiDecisionIndex()).eq(0);
    stepAiDecision(1);
    expect(aiFeedbackState.dialog?.target.messageId).eq('2.b');
    expect(aiFeedbackState.dialog?.decision).is.undefined;
    stepAiDecision(1);
    expect(aiFeedbackState.dialog?.target.messageId).eq('2.b');
    stepAiDecision(-1);
    expect(aiFeedbackState.dialog?.target.messageId).eq('1.a');
    expect(aiFeedbackState.dialog?.decision).eq(summary);
  });

  it('opens and closes the dialog', () => {
    const ai = message('AI line');
    ai.id = '2.b';
    ai.aiInsight = 'red';
    const viewModel = {id: 'p-red'} as any;

    openAiDecision(targetOf(ai)!, summary, viewModel, 'down');
    expect(aiFeedbackState.dialog?.target.messageId).eq('2.b');
    expect(aiFeedbackState.dialog?.rating).eq('down');
    closeAiDecision();
    expect(aiFeedbackState.dialog).is.undefined;
  });
});
