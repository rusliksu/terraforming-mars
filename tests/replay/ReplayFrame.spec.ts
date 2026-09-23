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
    publicLog.actionId = 'visible-action';
    publicLog.effect = {kind: 'resource', resource: 'megacredits', production: false, amount: 6, player: blue.color};
    const hiddenLog = new LogMessage(LogMessageType.DEFAULT, 'hidden-log-sentinel', []);
    hiddenLog.hiddenFor = [game.spectatorId];
    hiddenLog.actionId = 'hidden-action';
    hiddenLog.effect = {kind: 'resource', resource: 'megacredits', production: false, amount: 999, player: red.color};
    game.gameLog = [publicLog, new LogMessage(LogMessageType.DEFAULT, 'private-log-sentinel', [], red.id), hiddenLog];
    const saved = game.serialize();
    saved.lastSaveId = 9;
    saved.gameOptions.clonedGamedId = 'private-clone-sentinel';
    saved.gameOptions.customCorporationsList = [CardName.BIRDS];
    saved.gameOptions.modularMA = true;
    saved.gameOptions.startingCorporations = 7;
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
    expect(frame.logs[0].actionId).eq('visible-action');
    expect(frame.logs[0].effect).deep.eq(publicLog.effect);
    expect(frame.view.game.gameOptions.customCorporationsList).deep.eq([]);
    expect(frame.view.game.gameOptions.modularMA).eq(false);
    expect(frame.view.game.gameOptions.startingCorporations).eq(0);
    expect(JSON.stringify(frame)).not.to.contain('private-clone-sentinel');
    for (const secret of [blue.id, red.id, CardName.BIRDS, CardName.ASTEROID,
      'private-telegram-sentinel', 'private-log-sentinel', 'hidden-log-sentinel', 'private-expansion-sentinel']) {
      expect(JSON.stringify(frame), secret).not.to.contain(secret);
    }
    expect(JSON.stringify(frame)).not.to.contain('hidden-action');
    expect(JSON.stringify(frame)).not.to.contain('999');
    expect(saved).deep.eq(before);
  });

  it('freezes recorded timers instead of advancing them while the replay is viewed', () => {
    const [game] = testGame(2);
    const saved = game.serialize();
    saved.players[0].timer = {sumElapsed: 1200, startedAt: 10, running: true, afterFirstAction: true, lastStoppedAt: 10};
    const frame = toReplayFrame(saved);
    expect(frame.view.players[0].timer).deep.eq({
      sumElapsed: 1200, startedAt: 10, running: false, afterFirstAction: true, lastStoppedAt: 10,
    });
    expect(saved.players[0].timer.running).eq(true);
  });
});
