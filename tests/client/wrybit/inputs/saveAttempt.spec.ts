import {expect} from 'chai';
import {afterSave, copyInputResponse, createSaveSession} from '@/client/wrybit/inputs/saveAttempt';

describe('input save attempt', () => {
  it('allows one pending attempt and an old completion cannot finish a newer attempt', () => {
    const session = createSaveSession();
    const first = session.begin();
    expect(first?.isCurrent()).is.true;
    expect(session.begin()).is.undefined;
    session.cancel();
    expect(first?.signal.aborted).is.true;
    expect(first?.isCurrent()).is.false;
    const second = session.begin();
    if (first !== undefined) {
      session.finish(first);
    }
    expect(second?.isCurrent()).is.true;
    if (second !== undefined) {
      session.finish(second);
    }
    expect(second?.isCurrent()).is.false;
  });

  it('keeps synchronous completion synchronous and copies the submitted wire response', async () => {
    expect(afterSave(3, (value) => value + 1)).eq(4);
    expect(await afterSave(Promise.resolve(3), (value) => value + 1)).eq(4);
    const response = {type: 'card' as const, cards: []};
    const copy = copyInputResponse(response);
    expect(copy).deep.eq({type: 'card', cards: []});
    expect(copy).not.eq(response);
    if (copy.type === 'card') {
      expect(copy.cards).not.eq(response.cards);
    }
  });
});
