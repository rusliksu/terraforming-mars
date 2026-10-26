import {expect} from 'chai';
import {promptFingerprintFromWaitingFor} from '../../../src/server/game/promptFingerprint';

describe('promptFingerprintFromWaitingFor', () => {
  it('ignores the view-model prompt identity', () => {
    const prompt = {
      type: 'card',
      title: 'Select card(s) to buy',
      buttonLabel: 'Buy',
      cards: [{name: 'Sponsors'}, {name: 'Power Plant'}],
      min: 0,
      max: 2,
    };

    const fingerprint = promptFingerprintFromWaitingFor(prompt);

    expect(promptFingerprintFromWaitingFor({...prompt, promptId: 'prompt-1'})).eq(fingerprint);
    expect(promptFingerprintFromWaitingFor({...prompt, promptId: 'prompt-2'})).eq(fingerprint);
  });
});
