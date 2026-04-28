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

  function stubTelegramApi(nextMessageIds: number | Array<number>): {calls: Array<{path: string, body: any}>, restore: () => void} {
    const calls: Array<{path: string, body: any}> = [];
    const messageIds = Array.isArray(nextMessageIds) ? [...nextMessageIds] : [nextMessageIds];
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
          {ok: true, result: {message_id: messageIds.shift()}} :
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

  it('uses a twelve hour reminder interval by default', () => {
    const originalReminderMs = process.env.TM_TURN_NOTICE_REMINDER_MS;
    const originalSetTimeout = global.setTimeout;
    const delays: Array<number | undefined> = [];
    delete process.env.TM_TURN_NOTICE_REMINDER_MS;

    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    Game.newInstance('g-telegram', [player1, player2], player1);

    try {
      global.setTimeout = ((handler: TimerHandler, timeout?: number) => {
        delays.push(timeout);
        return {unref: () => {}, handler} as unknown as ReturnType<typeof setTimeout>;
      }) as unknown as typeof setTimeout;
      player1.telegramID = '123456';
      (player1 as any).waitingFor = new SelectOption('Act');
      const turnNoticeKey = (player1 as any).getTurnNoticeKey();
      player1.lastTurnNoticeKey = turnNoticeKey;
      player1.lastNoticeMessageId = 77;

      (player1 as any).scheduleTurnNoticeReminder(turnNoticeKey);

      expect(delays).deep.eq([12 * 60 * 60 * 1000]);
    } finally {
      (player1 as any)._pendingTurnNoticeReminderTimer = undefined;
      (player1 as any)._pendingTurnNoticeReminderKey = undefined;
      global.setTimeout = originalSetTimeout;
      if (originalReminderMs === undefined) {
        delete process.env.TM_TURN_NOTICE_REMINDER_MS;
      } else {
        process.env.TM_TURN_NOTICE_REMINDER_MS = originalReminderMs;
      }
    }
  });

  it('sends repeated reminders for a stale active turn notice', async () => {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    const originalLog = console.log;
    process.env.TM_BOT_TOKEN = 'token';
    delete process.env.TM_DISABLE_TELEGRAM;
    const telegram = stubTelegramApi([101, 102]);
    console.log = (() => {}) as typeof console.log;

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
      expect(sendCalls).has.length(2);
      expect(deleteCalls).has.length(2);
      expect(deleteCalls[0].body.message_id).eq(77);
      expect(deleteCalls[1].body.message_id).eq(101);
      expect(player1.lastNoticeMessageId).eq(102);
      expect(player1.lastTurnReminderNoticeKey).eq(turnNoticeKey);
    } finally {
      clearTelegramTimers(player1);
      telegram.restore();
      console.log = originalLog;
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
