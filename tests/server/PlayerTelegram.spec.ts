import {expect} from 'chai';
import {EventEmitter} from 'events';
import https from 'https';
import {Game} from '../../src/server/Game';
import {Player} from '../../src/server/Player';
import {SelectOption} from '../../src/server/inputs/SelectOption';

describe('Player telegram state', () => {
  function clearTelegramTimers(player: Player): void {
    const pendingTurnNoticeTimer = (player as any)._pendingTurnNoticeTimer;
    if (pendingTurnNoticeTimer) {
      clearTimeout(pendingTurnNoticeTimer);
      (player as any)._pendingTurnNoticeTimer = undefined;
    }
    const pendingTurnNoticeReminderTimer = (player as any)._pendingTurnNoticeReminderTimer;
    if (pendingTurnNoticeReminderTimer) {
      clearTimeout(pendingTurnNoticeReminderTimer);
      (player as any)._pendingTurnNoticeReminderTimer = undefined;
    }
  }

  function stubTelegramApi(nextMessageId: number): {calls: Array<{path: string, body: any}>, restore: () => void} {
    const calls: Array<{path: string, body: any}> = [];
    const originalRequest = https.request;
    (https as any).request = (options: {path: string}, cb: (res: EventEmitter) => void) => {
      let requestBody = '';
      const req = new EventEmitter() as any;
      req.write = (chunk: string) => {
        requestBody += chunk;
      };
      req.end = () => {
        const body = JSON.parse(requestBody);
        calls.push({path: options.path, body});
        const res = new EventEmitter();
        cb(res);
        const response = options.path.includes('/sendMessage') ?
          {ok: true, result: {message_id: nextMessageId}} :
          {ok: true, result: true};
        res.emit('data', JSON.stringify(response));
        res.emit('end');
      };
      return req;
    };
    return {
      calls,
      restore: () => {
        (https as any).request = originalRequest;
      },
    };
  }

  it('preserves notice state across game serialization', () => {
    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    const game = Game.newInstance('g-telegram', [player1, player2], player1);

    player1.telegramID = '123456';
    player1.lastNoticeMessageId = 77;
    player1.lastTurnNoticeKey = 'g-telegram:1:action:p-ruslan:0';
    player1.lastTurnReminderNoticeKey = 'g-telegram:1:action:p-ruslan:0';

    const restored = Game.deserialize(game.serialize());
    const restoredPlayer = restored.getPlayerById(player1.id) as Player;

    expect(restoredPlayer.telegramID).eq('123456');
    expect(restoredPlayer.lastNoticeMessageId).eq(77);
    expect(restoredPlayer.lastTurnNoticeKey).eq('g-telegram:1:action:p-ruslan:0');
    expect(restoredPlayer.lastTurnReminderNoticeKey).eq('g-telegram:1:action:p-ruslan:0');
  });

  it('sends only one reminder for a stale active turn notice', async () => {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    process.env.TM_BOT_TOKEN = 'token';
    delete process.env.TM_DISABLE_TELEGRAM;
    const telegram = stubTelegramApi(101);

    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    Game.newInstance('g-telegram', [player1, player2], player1);

    try {
      player1.telegramID = '123456';
      (player1 as any).waitingFor = undefined;
      (player1 as any).waitingForCb = undefined;
      player1.setWaitingFor(new SelectOption('Act'));
      clearTelegramTimers(player1);
      const turnNoticeKey = (player1 as any).getTurnNoticeKey();
      player1.lastTurnNoticeKey = turnNoticeKey;
      player1.lastNoticeMessageId = 77;

      await (player1 as any).sendTurnNoticeReminder(turnNoticeKey);
      await (player1 as any).sendTurnNoticeReminder(turnNoticeKey);

      const sendCalls = telegram.calls.filter((call) => call.path.includes('/sendMessage'));
      const deleteCalls = telegram.calls.filter((call) => call.path.includes('/deleteMessage'));
      expect(sendCalls).has.length(1);
      expect(deleteCalls).has.length(1);
      expect(deleteCalls[0].body.message_id).eq(77);
      expect(player1.lastNoticeMessageId).eq(101);
      expect(player1.lastTurnReminderNoticeKey).eq(turnNoticeKey);
    } finally {
      clearTelegramTimers(player1);
      telegram.restore();
      if (originalToken === undefined) {
        delete process.env.TM_BOT_TOKEN;
      } else {
        process.env.TM_BOT_TOKEN = originalToken;
      }
      if (originalDisabled === undefined) {
        delete process.env.TM_DISABLE_TELEGRAM;
      } else {
        process.env.TM_DISABLE_TELEGRAM = originalDisabled;
      }
    }
  });
});
