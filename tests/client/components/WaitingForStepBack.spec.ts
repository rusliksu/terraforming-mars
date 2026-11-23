import {expect} from 'chai';
import {describe, it} from 'vitest';
import WaitingFor from '@/client/components/WaitingFor.vue';

type StepBackContext = {
  playerView: {
    game: {gameOptions: {undoStepOption?: boolean}},
    canStepBack?: boolean,
    thisPlayer?: {isActive?: boolean},
  },
  waitingfor?: unknown,
};

const showStepBack = (WaitingFor as unknown as {methods: {showStepBack: (this: StepBackContext) => boolean}}).methods.showStepBack;

function context(overrides: Partial<StepBackContext['playerView']> = {}): StepBackContext {
  return {
    playerView: {
      game: {gameOptions: {undoStepOption: true}},
      canStepBack: true,
      thisPlayer: {isActive: true},
      ...overrides,
    },
    waitingfor: {type: 'or'},
  };
}

describe('WaitingFor.showStepBack', () => {
  it('offers step undo when the game, prompt and player all allow it', () => {
    expect(showStepBack.call(context())).to.be.true;
  });

  it('hides step undo when the persisted journal was not restored', () => {
    expect(showStepBack.call(context({canStepBack: false}))).to.be.false;
    expect(showStepBack.call(context({canStepBack: undefined}))).to.be.false;
  });

  it('hides step undo for games without the option', () => {
    expect(showStepBack.call(context({game: {gameOptions: {undoStepOption: false}}}))).to.be.false;
  });

  it('hides step undo when the player is not the active one', () => {
    expect(showStepBack.call(context({thisPlayer: {isActive: false}}))).to.be.false;
  });

  it('hides step undo when no prompt is waiting', () => {
    const ctx = context();
    ctx.waitingfor = undefined;
    expect(showStepBack.call(ctx)).to.be.false;
  });
});
