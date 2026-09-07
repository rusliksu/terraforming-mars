import {expect} from 'chai';
import {Game} from '@/server/Game';
import {Phase} from '@/common/Phase';
import {Timer} from '@/common/Timer';
import {CrediCor} from '@/server/cards/corporation/CrediCor';
import {Helion} from '@/server/cards/corporation/Helion';
import {testGame} from '@tests/TestGame';

describe('Replay view loading', () => {
  it('leaves recorded research and action phases without waiting inputs', () => {
    const [game, blue, red] = testGame(2);
    const initial = game.serialize();
    blue.playedCards.push(new CrediCor());
    red.playedCards.push(new Helion());
    const action = game.serialize();
    action.phase = Phase.ACTION;
    action.generation = 2;
    const research = structuredClone(action);
    research.phase = Phase.RESEARCH;
    const production = structuredClone(action);
    production.phase = Phase.PRODUCTION;
    const [draftGame] = testGame(2, {initialDraftVariant: true});
    const draft = draftGame.serialize();
    action.globalsPerGeneration = [{}];
    Object.assign(action.globalsPerGeneration[0], {'moon-logistics': 1});

    for (const saved of [initial, draft, research, action, production]) {
      const before = structuredClone(saved);
      const view = Game.deserialize(saved, {viewOnly: true});
      expect(view.phase).eq(saved.phase);
      expect(view.getGeneration()).eq(saved.generation);
      expect(view.players.every((player) => player.getWaitingFor() === undefined)).eq(true);
      expect(view.deferredActions.length).eq(0);
      expect(view.gameLog).deep.eq(before.gameLog);
      expect(saved).deep.eq(before);
    }
  });

  it('does not restore the shared live timer from a saved frame', () => {
    const [game] = testGame(2);
    const saved = game.serialize();
    const before = Timer.newInstance().serialize().lastStoppedAt;
    const descriptor = Object.getOwnPropertyDescriptor(Timer, 'lastStoppedAt');
    saved.players[0].timer.lastStoppedAt = before + 60000;
    try {
      Game.deserialize(saved, {viewOnly: true});
      expect(Timer.newInstance().serialize().lastStoppedAt).eq(before);
    } finally {
      if (descriptor !== undefined) {
        Object.defineProperty(Timer, 'lastStoppedAt', descriptor);
      }
    }
  });
});
