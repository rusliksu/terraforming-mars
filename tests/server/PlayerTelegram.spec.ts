import {expect} from 'chai';
import {EventEmitter} from 'events';
import * as fs from 'fs';
import https from 'https';
import * as os from 'os';
import * as path from 'path';
import {Phase} from '../../src/common/Phase';
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
    const game = Game.newInstance('g-telegram', [player1, player2], player1, 'spectatorid', {turnBasedGame: true});

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
    Game.newInstance('g-telegram', [player1, player2], player1, 'spectatorid', {turnBasedGame: true});

    try {
      global.setTimeout = ((handler: Parameters<typeof setTimeout>[0], timeout?: number) => {
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

  it('repeats reminders during initial drafting while the player is still waiting', async () => {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    const originalStore = process.env.TM_TURN_NOTICE_STORE;
    const originalSetTimeout = global.setTimeout;
    const originalLog = console.log;
    const storePath = path.join(os.tmpdir(), `tm-turn-notices-${Date.now()}-${Math.random()}.json`);
    const delays: Array<number | undefined> = [];
    process.env.TM_BOT_TOKEN = 'token';
    process.env.TM_TURN_NOTICE_STORE = storePath;
    delete process.env.TM_DISABLE_TELEGRAM;
    const telegram = stubTelegramApi(101);
    console.log = (() => {}) as typeof console.log;

    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    const game = Game.newInstance('g-telegram', [player1, player2], player1, 'spectatorid', {turnBasedGame: true});
    game.phase = Phase.INITIALDRAFTING;
    player1.needsToDraft = true;

    try {
      global.setTimeout = ((_handler: Parameters<typeof setTimeout>[0], timeout?: number) => {
        delays.push(timeout);
        return {unref: () => {}} as unknown as ReturnType<typeof setTimeout>;
      }) as unknown as typeof setTimeout;
      player1.telegramID = '123456';
      (player1 as any).waitingFor = new SelectOption('Keep');
      const turnNoticeKey = (player1 as any).getTurnNoticeKey();
      player1.lastTurnNoticeKey = turnNoticeKey;
      player1.lastNoticeMessageId = 77;

      (player1 as any).scheduleTurnNoticeReminder(turnNoticeKey);
      await (player1 as any).sendTurnNoticeReminder(turnNoticeKey);

      const sendCalls = telegram.calls.filter((call) => call.path.includes('/sendMessage'));
      const deleteCalls = telegram.calls.filter((call) => call.path.includes('/deleteMessage'));
      expect(delays).deep.eq([12 * 60 * 60 * 1000]);
      expect(sendCalls).has.length(1);
      expect(sendCalls[0].body.text).contains('Напоминание: нужно выбрать карту в начальном драфте!');
      expect(deleteCalls).has.length(1);
      expect(deleteCalls[0].body.message_id).eq(77);
      expect((player1 as any)._pendingTurnNoticeReminderTimer).not.to.be.undefined;
      expect(player1.lastNoticeMessageId).eq(101);
    } finally {
      clearTelegramTimers(player1);
      telegram.restore();
      global.setTimeout = originalSetTimeout;
      console.log = originalLog;
      fs.rmSync(storePath, {force: true});
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
      if (originalStore === undefined) {
        delete process.env.TM_TURN_NOTICE_STORE;
      } else {
        process.env.TM_TURN_NOTICE_STORE = originalStore;
      }
    }
  });

  it('clears initial draft notices when the player can only change a submitted pick', async () => {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    const originalSetTimeout = global.setTimeout;
    const delays: Array<number | undefined> = [];
    process.env.TM_BOT_TOKEN = 'token';
    delete process.env.TM_DISABLE_TELEGRAM;
    const telegram = stubTelegramApi(101);

    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    const game = Game.newInstance('g-telegram', [player1, player2], player1, 'spectatorid', {turnBasedGame: true});
    game.phase = Phase.INITIALDRAFTING;

    try {
      global.setTimeout = ((_handler: Parameters<typeof setTimeout>[0], timeout?: number) => {
        delays.push(timeout);
        return {unref: () => {}} as unknown as ReturnType<typeof setTimeout>;
      }) as unknown as typeof setTimeout;
      player1.telegramID = '123456';
      player1.needsToDraft = false;
      player1.lastTurnNoticeKey = (player1 as any).getTurnNoticeKey();
      player1.lastNoticeMessageId = 77;

      player1.setWaitingFor(new SelectOption('Change initial draft pick'));
      await new Promise((resolve) => setImmediate(resolve));

      const sendCalls = telegram.calls.filter((call) => call.path.includes('/sendMessage'));
      const deleteCalls = telegram.calls.filter((call) => call.path.includes('/deleteMessage'));
      expect(delays).deep.eq([]);
      expect(sendCalls).has.length(0);
      expect(deleteCalls).has.length(1);
      expect(deleteCalls[0].body.message_id).eq(77);
      expect(player1.lastNoticeMessageId).eq(-1);
      expect((player1 as any)._pendingTurnNoticeTimer).is.undefined;
      expect((player1 as any)._pendingTurnNoticeReminderTimer).is.undefined;
    } finally {
      clearTelegramTimers(player1);
      telegram.restore();
      global.setTimeout = originalSetTimeout;
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

  it('does not schedule turn notices for non-async games with stale telegram ids', () => {
    const originalSetTimeout = global.setTimeout;
    const delays: Array<number | undefined> = [];

    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    Game.newInstance('g-telegram', [player1, player2], player1, 'spectatorid', {turnBasedGame: false});

    try {
      global.setTimeout = ((_handler: Parameters<typeof setTimeout>[0], timeout?: number) => {
        delays.push(timeout);
        return {unref: () => {}} as unknown as ReturnType<typeof setTimeout>;
      }) as unknown as typeof setTimeout;
      player1.telegramID = '123456';

      player1.setWaitingFor(new SelectOption('Act'));

      expect(delays).deep.eq([]);
      expect((player1 as any)._pendingTurnNoticeTimer).is.undefined;
      expect((player1 as any)._pendingTurnNoticeReminderTimer).is.undefined;
    } finally {
      clearTelegramTimers(player1);
      global.setTimeout = originalSetTimeout;
    }
  });

  it('sends repeated reminders for a stale active turn notice', async () => {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    const originalStore = process.env.TM_TURN_NOTICE_STORE;
    const storePath = path.join(os.tmpdir(), `tm-turn-notices-${Date.now()}-${Math.random()}.json`);
    const originalLog = console.log;
    process.env.TM_BOT_TOKEN = 'token';
    process.env.TM_TURN_NOTICE_STORE = storePath;
    delete process.env.TM_DISABLE_TELEGRAM;
    const telegram = stubTelegramApi([101, 102]);
    console.log = (() => {}) as typeof console.log;

    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    Game.newInstance('g-telegram', [player1, player2], player1, 'spectatorid', {turnBasedGame: true});

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
      fs.rmSync(storePath, {force: true});
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
      if (originalStore === undefined) {
        delete process.env.TM_TURN_NOTICE_STORE;
      } else {
        process.env.TM_TURN_NOTICE_STORE = originalStore;
      }
    }
  });

  it('reschedules a reminder when an existing turn notice survives in the store', async () => {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    const originalStore = process.env.TM_TURN_NOTICE_STORE;
    const originalReminderMs = process.env.TM_TURN_NOTICE_REMINDER_MS;
    const originalSetTimeout = global.setTimeout;
    const originalLog = console.log;
    const storePath = path.join(os.tmpdir(), `tm-turn-notices-${Date.now()}-${Math.random()}.json`);
    const delays: Array<number | undefined> = [];
    const handlers: Array<Parameters<typeof setTimeout>[0]> = [];
    process.env.TM_BOT_TOKEN = 'token';
    process.env.TM_TURN_NOTICE_STORE = storePath;
    process.env.TM_TURN_NOTICE_REMINDER_MS = '7200000';
    delete process.env.TM_DISABLE_TELEGRAM;
    const telegram = stubTelegramApi(101);
    console.log = (() => {}) as typeof console.log;

    global.setTimeout = ((handler: Parameters<typeof setTimeout>[0], timeout?: number) => {
      delays.push(timeout);
      handlers.push(handler);
      return {unref: () => {}} as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;

    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    Game.newInstance('g-telegram', [player1, player2], player1, 'spectatorid', {turnBasedGame: true});

    try {
      player1.telegramID = '123456';
      (player1 as any).waitingFor = undefined;
      (player1 as any).waitingForCb = undefined;
      player1.setWaitingFor(new SelectOption('Act'));
      const initialNoticeHandler = handlers.shift();
      expect(initialNoticeHandler).not.to.be.undefined;
      await (initialNoticeHandler as () => Promise<void>)();
      const turnNoticeKey = player1.lastTurnNoticeKey;

      delays.length = 0;
      handlers.length = 0;

      const restoredPlayer1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
      const restoredPlayer2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
      Game.newInstance('g-telegram', [restoredPlayer1, restoredPlayer2], restoredPlayer1, 'spectatorid', {turnBasedGame: true});
      restoredPlayer1.telegramID = '123456';
      (restoredPlayer1 as any).waitingFor = undefined;
      (restoredPlayer1 as any).waitingForCb = undefined;
      restoredPlayer1.setWaitingFor(new SelectOption('Act'));

      const restoredNoticeHandler = handlers.shift();
      expect(restoredNoticeHandler).not.to.be.undefined;
      await (restoredNoticeHandler as () => Promise<void>)();

      const sendCalls = telegram.calls.filter((call) => call.path.includes('/sendMessage'));
      expect(sendCalls).has.length(1);
      expect(restoredPlayer1.lastNoticeMessageId).eq(101);
      expect(restoredPlayer1.lastTurnNoticeKey).eq(turnNoticeKey);
      expect((restoredPlayer1 as any)._pendingTurnNoticeReminderKey).eq(turnNoticeKey);
      const reminderDelay = delays.find((delay) => delay !== 5000);
      expect(reminderDelay).not.to.be.undefined;
      expect(reminderDelay).lte(7200000);
      expect(reminderDelay).gt(7190000);
    } finally {
      clearTelegramTimers(player1);
      telegram.restore();
      global.setTimeout = originalSetTimeout;
      console.log = originalLog;
      fs.rmSync(storePath, {force: true});
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
      if (originalStore === undefined) {
        delete process.env.TM_TURN_NOTICE_STORE;
      } else {
        process.env.TM_TURN_NOTICE_STORE = originalStore;
      }
      if (originalReminderMs === undefined) {
        delete process.env.TM_TURN_NOTICE_REMINDER_MS;
      } else {
        process.env.TM_TURN_NOTICE_REMINDER_MS = originalReminderMs;
      }
    }
  });

  it('sends the reminder immediately when a restored turn notice is already stale', async () => {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    const originalStore = process.env.TM_TURN_NOTICE_STORE;
    const originalReminderMs = process.env.TM_TURN_NOTICE_REMINDER_MS;
    const originalSetTimeout = global.setTimeout;
    const originalLog = console.log;
    const storePath = path.join(os.tmpdir(), `tm-turn-notices-${Date.now()}-${Math.random()}.json`);
    const delays: Array<number | undefined> = [];
    const handlers: Array<Parameters<typeof setTimeout>[0]> = [];
    process.env.TM_BOT_TOKEN = 'token';
    process.env.TM_TURN_NOTICE_STORE = storePath;
    process.env.TM_TURN_NOTICE_REMINDER_MS = '7200000';
    delete process.env.TM_DISABLE_TELEGRAM;
    const telegram = stubTelegramApi(101);
    console.log = (() => {}) as typeof console.log;

    global.setTimeout = ((handler: Parameters<typeof setTimeout>[0], timeout?: number) => {
      delays.push(timeout);
      handlers.push(handler);
      return {unref: () => {}} as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;

    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    Game.newInstance('g-telegram', [player1, player2], player1, 'spectatorid', {turnBasedGame: true});

    try {
      player1.telegramID = '123456';
      (player1 as any).waitingFor = undefined;
      (player1 as any).waitingForCb = undefined;
      player1.setWaitingFor(new SelectOption('Act'));
      const initialNoticeHandler = handlers.shift();
      expect(initialNoticeHandler).not.to.be.undefined;
      await (initialNoticeHandler as () => Promise<void>)();
      const turnNoticeKey = player1.lastTurnNoticeKey;
      const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      store['g-telegram:p-ruslan'].updatedAt = new Date(Date.now() - 7200001).toISOString();
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2));

      delays.length = 0;
      handlers.length = 0;

      const restoredPlayer1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
      const restoredPlayer2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
      Game.newInstance('g-telegram', [restoredPlayer1, restoredPlayer2], restoredPlayer1, 'spectatorid', {turnBasedGame: true});
      restoredPlayer1.telegramID = '123456';
      (restoredPlayer1 as any).waitingFor = undefined;
      (restoredPlayer1 as any).waitingForCb = undefined;
      restoredPlayer1.setWaitingFor(new SelectOption('Act'));

      const restoredNoticeHandler = handlers.shift();
      expect(restoredNoticeHandler).not.to.be.undefined;
      await (restoredNoticeHandler as () => Promise<void>)();

      const sendCalls = telegram.calls.filter((call) => call.path.includes('/sendMessage'));
      expect(sendCalls).has.length(1);
      expect(restoredPlayer1.lastNoticeMessageId).eq(101);
      expect(restoredPlayer1.lastTurnNoticeKey).eq(turnNoticeKey);
      expect((restoredPlayer1 as any)._pendingTurnNoticeReminderKey).eq(turnNoticeKey);
      expect(delays).contains(0);
    } finally {
      clearTelegramTimers(player1);
      telegram.restore();
      global.setTimeout = originalSetTimeout;
      console.log = originalLog;
      fs.rmSync(storePath, {force: true});
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
      if (originalStore === undefined) {
        delete process.env.TM_TURN_NOTICE_STORE;
      } else {
        process.env.TM_TURN_NOTICE_STORE = originalStore;
      }
      if (originalReminderMs === undefined) {
        delete process.env.TM_TURN_NOTICE_REMINDER_MS;
      } else {
        process.env.TM_TURN_NOTICE_REMINDER_MS = originalReminderMs;
      }
    }
  });

  it('keeps the turn notice while the same player is still waiting for input', async () => {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    process.env.TM_BOT_TOKEN = 'token';
    delete process.env.TM_DISABLE_TELEGRAM;
    const telegram = stubTelegramApi(101);

    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    Game.newInstance('g-telegram', [player1, player2], player1, 'spectatorid', {turnBasedGame: true});

    try {
      player1.telegramID = '123456';
      player1.lastTurnNoticeKey = (player1 as any).getTurnNoticeKey();
      player1.lastNoticeMessageId = 77;
      (player1 as any).waitingFor = new SelectOption('First prompt');
      (player1 as any).waitingForCb = () => {
        player1.setWaitingFor(new SelectOption('Second prompt'));
      };

      player1.process({type: 'option'});

      const deleteCalls = telegram.calls.filter((call) => call.path.includes('/deleteMessage'));
      expect(deleteCalls).has.length(0);
      expect(player1.lastNoticeMessageId).eq(77);
      expect(player1.getWaitingFor()).not.to.be.undefined;
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

  it('deletes the turn notice after the player finishes waiting for input', async () => {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    process.env.TM_BOT_TOKEN = 'token';
    delete process.env.TM_DISABLE_TELEGRAM;
    const telegram = stubTelegramApi(101);

    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    Game.newInstance('g-telegram', [player1, player2], player1, 'spectatorid', {turnBasedGame: true});

    try {
      player1.telegramID = '123456';
      player1.lastTurnNoticeKey = (player1 as any).getTurnNoticeKey();
      player1.lastNoticeMessageId = 77;
      (player1 as any).waitingFor = new SelectOption('Last prompt');
      (player1 as any).waitingForCb = () => {};

      player1.process({type: 'option'});
      await new Promise((resolve) => setImmediate(resolve));

      const deleteCalls = telegram.calls.filter((call) => call.path.includes('/deleteMessage'));
      expect(deleteCalls).has.length(1);
      expect(deleteCalls[0].body.message_id).eq(77);
      expect(player1.lastNoticeMessageId).eq(-1);
      expect(player1.getWaitingFor()).is.undefined;
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
