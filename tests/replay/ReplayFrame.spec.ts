import {expect} from 'chai';
import {Phase} from '@/common/Phase';
import {CardName} from '@/common/cards/CardName';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {toReplayFrame} from '@/server/replay/ReplayFrame';
import {CrediCor} from '@/server/cards/corporation/CrediCor';
import {Helion} from '@/server/cards/corporation/Helion';
import {Birds} from '@/server/cards/base/Birds';
import {Asteroid} from '@/server/cards/base/Asteroid';
import {testGame} from '@tests/TestGame';

describe('Replay frame projection', () => {
  it('keeps recorded public values without access IDs, private cards or private logs', () => {
    const [game, blue, red] = testGame(2, {aresExtension: true});
    blue.playedCards.push(new CrediCor());
    red.playedCards.push(new Helion());
    blue.megaCredits = 37;
    blue.production.override({megacredits: 4});
    blue.cardsInHand = [new Birds()];
    blue.draftedCards = [new Asteroid()];
    blue.telegramID = 'private-telegram-sentinel';
    game.phase = Phase.END;
    const publicLog = new LogMessage(LogMessageType.DEFAULT, 'Recorded public message', []);
    publicLog.hiddenFor = [blue.id];
    const hiddenLog = new LogMessage(LogMessageType.DEFAULT, 'hidden-log-sentinel', []);
    hiddenLog.hiddenFor = [game.spectatorId];
    game.gameLog = [publicLog, new LogMessage(LogMessageType.DEFAULT, 'private-log-sentinel', [], red.id), hiddenLog];
    const saved = game.serialize();
    saved.lastSaveId = 9;
    if (saved.aresData === undefined) {
      throw new Error('Ares fixture missing');
    }
    saved.aresData.milestoneResults = [{id: blue.id, networkerCount: 2, purifierCount: 3}];
    Object.assign(saved.players[0].underworldData, {privateField: 'private-expansion-sentinel'});
    const before = structuredClone(saved);

    const frame = toReplayFrame(saved);
    expect(frame.saveId).eq(9);
    expect(frame.view.game.phase).eq(Phase.END);
    expect(frame.view.players[0].megacredits).eq(37);
    expect(frame.view.players[0].megacreditProduction).eq(4);
    expect(frame.view.players[0].tableau.map((card) => card.name)).deep.eq([CardName.CREDICOR]);
    expect(frame.logs.map((message) => message.message)).deep.eq(['Recorded public message']);
    for (const secret of [blue.id, red.id, CardName.BIRDS, CardName.ASTEROID,
      'private-telegram-sentinel', 'private-log-sentinel', 'hidden-log-sentinel', 'private-expansion-sentinel']) {
      expect(JSON.stringify(frame), secret).not.to.contain(secret);
    }
    expect(saved).deep.eq(before);
  });

  it('freezes recorded timers instead of advancing them while the replay is viewed', () => {
    const [game] = testGame(2);
    const saved = game.serialize();
    saved.players[0].timer = {sumElapsed: 1200, startedAt: 10, running: true, afterFirstAction: true, lastStoppedAt: 10};
    const frame = toReplayFrame(saved);
    expect(frame.view.players[0].timer.sumElapsed).eq(1200);
    expect(frame.view.players[0].timer.running).eq(false);
    expect(saved.players[0].timer.running).eq(true);
  });
});
