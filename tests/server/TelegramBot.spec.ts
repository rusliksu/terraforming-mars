import {expect} from 'chai';
import {EventEmitter} from 'events';
import * as fs from 'fs';
import https from 'https';
import * as os from 'os';
import * as path from 'path';
import {BotTakeoverManager} from '../../src/server/bot/BotTakeoverManager';
import {
  buildBotTakeoverNoticeText,
  buildTurnNoticeText,
  deleteTurnNotice,
  sendBotTakeoverNotice,
  sendGameStartNotice,
  sendTurnNotice,
} from '../../src/server/TelegramBot';

describe('TelegramBot', () => {
  type TestTurnNoticeRecord = {
    gameId: string;
    playerId: string;
    chatId: string;
    messageId: number;
    turnNoticeKey?: string;
    updatedAt: string;
  };

  function withTelegramEnabled<T>(fn: (storePath: string) => Promise<T>): Promise<T> {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    const originalStore = process.env.TM_TURN_NOTICE_STORE;
    const storePath = path.join(os.tmpdir(), `tm-turn-notices-${Date.now()}-${Math.random()}.json`);
    process.env.TM_BOT_TOKEN = 'token';
    process.env.TM_TURN_NOTICE_STORE = storePath;
    delete process.env.TM_DISABLE_TELEGRAM;
    return fn(storePath).finally(() => {
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
    });
  }

  function writeTurnNoticeStore(storePath: string, key: string, record: TestTurnNoticeRecord): void {
    fs.writeFileSync(storePath, JSON.stringify({[key]: record}, null, 2));
  }

  function readTurnNoticeStore(storePath: string): Record<string, TestTurnNoticeRecord> {
    return JSON.parse(fs.readFileSync(storePath, 'utf8')) as Record<string, TestTurnNoticeRecord>;
  }

  function stubTelegramApi(response: object): {calls: Array<{path: string, body: any}>, restore: () => void} {
    const originalRequest = https.request;
    const calls: Array<{path: string, body: any}> = [];
    (https as any).request = (options: {path: string}, cb: (res: EventEmitter) => void) => {
      let requestBody = '';
      const req = new EventEmitter() as any;
      req.write = (chunk: string) => {
        requestBody += chunk;
      };
      req.end = () => {
        calls.push({path: options.path, body: JSON.parse(requestBody)});
        const res = new EventEmitter();
        cb(res);
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

  function captureConsole(method: 'log' | 'warn'): {messages: Array<string>, restore: () => void} {
    const original = console[method];
    const messages: Array<string> = [];
    console[method] = ((...args: Array<unknown>) => {
      messages.push(args.map(String).join(' '));
    }) as typeof console[typeof method];
    return {
      messages,
      restore: () => {
        console[method] = original;
      },
    };
  }

  it('builds a useful turn notice with link and participants', () => {
    const text = buildTurnNoticeText({
      name: 'Руслан',
      id: 'p-ruslan',
      telegramID: '123456',
      lastNoticeMessageId: -1,
      game: {
        id: 'g5d00c8e62c26',
        generation: 8,
        phase: 'action',
        players: [
          {name: 'Руслан', color: 'red'},
          {name: 'Паша', color: 'blue'},
          {name: 'Олеся', color: 'green'},
        ],
        gameOptions: {boardName: 'ELYSIUM'},
      },
    });

    expect(text).includes('Твой ход!');
    expect(text).includes('Игра g5d00c8e · Gen 8 · action · elysium · 3P');
    expect(text).includes('Игроки: Руслан (красный), Паша (синий), Олеся (зеленый)');
    expect(text).includes('https://tm.knightbyte.win/player?id=p-ruslan');
  });

  it('describes initial draft notices as card selection instead of a normal turn', () => {
    const text = buildTurnNoticeText({
      name: 'Даша',
      id: 'p-dasha',
      telegramID: '123456',
      lastNoticeMessageId: -1,
      game: {
        id: 'g5d00c8e62c26',
        generation: 1,
        phase: 'initial_drafting',
        players: [
          {name: 'Фелькнер', color: 'green'},
          {name: 'Даша', color: 'pink'},
          {name: 'GydRo', color: 'pearl'},
        ],
        gameOptions: {boardName: 'mars'},
      },
    });

    expect(text).includes('Нужно выбрать карту в начальном драфте!');
    expect(text).not.includes('Твой ход!');
    expect(text).includes('Игра g5d00c8e · Gen 1 · initial_drafting · mars · 3P');
  });

  it('describes initial draft reminders as card selection instead of a normal turn', () => {
    const text = buildTurnNoticeText({
      name: 'Даша',
      id: 'p-dasha',
      telegramID: '123456',
      lastNoticeMessageId: -1,
      game: {
        id: 'g5d00c8e62c26',
        generation: 1,
        phase: 'initial_drafting',
        players: [{name: 'Даша', color: 'pink'}],
        gameOptions: {boardName: 'mars'},
      },
    }, {reminder: true});

    expect(text).includes('Напоминание: нужно выбрать карту в начальном драфте!');
    expect(text).not.includes('Напоминание: твой ход!');
  });

  it('builds a useful bot takeover notice with game context', () => {
    const text = buildBotTakeoverNoticeText({
      name: 'Руслан',
      id: 'p-ruslan',
      telegramID: '123456',
      game: {
        id: 'g5d00c8e62c26',
        generation: 8,
        phase: 'action',
        players: [
          {name: 'Руслан', color: 'red'},
          {name: 'Владлен', color: 'blue'},
        ],
        gameOptions: {boardName: 'ELYSIUM'},
      },
    }, {
      name: 'Владлен',
      id: 'p-vladlen',
    });

    expect(text).includes('Внимание: бот включен за Владлен.');
    expect(text).includes('Игра g5d00c8e · Gen 8 · action · elysium · 2P');
    expect(text).includes('Игроки: Руслан (красный), Владлен (синий)');
    expect(text).includes('https://tm.knightbyte.win/game?id=g5d00c8e62c26');
  });

  it('suppresses turn notice while bot takeover is active', async () => {
    const original = BotTakeoverManager.INSTANCE.isActive;
    BotTakeoverManager.INSTANCE.isActive = (() => true) as typeof BotTakeoverManager.INSTANCE.isActive;
    try {
      const sent = await sendTurnNotice({
        name: 'Руслан',
        id: 'p-ruslan',
        telegramID: '123456',
        lastNoticeMessageId: -1,
      });
      expect(sent).eq(false);
    } finally {
      BotTakeoverManager.INSTANCE.isActive = original;
    }
  });

  it('suppresses turn notice when telegram is disabled', async () => {
    const original = process.env.TM_DISABLE_TELEGRAM;
    process.env.TM_DISABLE_TELEGRAM = '1';
    try {
      const sent = await sendTurnNotice({
        name: 'Руслан',
        id: 'p-ruslan',
        telegramID: '123456',
        lastNoticeMessageId: -1,
      });
      expect(sent).eq(false);
    } finally {
      if (original === undefined) {
        delete process.env.TM_DISABLE_TELEGRAM;
      } else {
        process.env.TM_DISABLE_TELEGRAM = original;
      }
    }
  });

  it('suppresses turn notice when telegram token is missing', async () => {
    const original = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    const warnings = captureConsole('warn');
    delete process.env.TM_BOT_TOKEN;
    delete process.env.TM_DISABLE_TELEGRAM;
    try {
      const sent = await sendTurnNotice({
        name: 'Руслан',
        id: 'p-ruslan',
        telegramID: '123456',
        lastNoticeMessageId: -1,
      });
      expect(sent).eq(false);
      expect(warnings.messages).has.length(1);
      expect(warnings.messages[0]).contains('Telegram turn notice skipped');
      expect(warnings.messages[0]).contains('missing TM_BOT_TOKEN');
      expect(warnings.messages[0]).contains('player=p-ruslan');
      expect(warnings.messages[0]).does.not.contain('123456');
    } finally {
      warnings.restore();
      if (original === undefined) {
        delete process.env.TM_BOT_TOKEN;
      } else {
        process.env.TM_BOT_TOKEN = original;
      }
      if (originalDisabled === undefined) {
        delete process.env.TM_DISABLE_TELEGRAM;
      } else {
        process.env.TM_DISABLE_TELEGRAM = originalDisabled;
      }
    }
  });

  it('logs successful turn notice sends without telegram chat id', async () => {
    const telegram = stubTelegramApi({ok: true, result: {message_id: 123}});
    const logs = captureConsole('log');
    try {
      await withTelegramEnabled(async () => {
        const sent = await sendTurnNotice({
          name: 'Руслан',
          id: 'p-ruslan',
          telegramID: '123456',
          lastNoticeMessageId: -1,
          game: {
            id: 'g-telegram',
            generation: 1,
            phase: 'action',
            players: [],
          },
        }, 'turn-key', {reminder: true});

        expect(sent).eq(true);
      });

      expect(logs.messages).has.length(1);
      expect(logs.messages[0]).contains('Telegram turn notice sent');
      expect(logs.messages[0]).contains('game=g-telegram');
      expect(logs.messages[0]).contains('player=p-ruslan');
      expect(logs.messages[0]).contains('message=123');
      expect(logs.messages[0]).contains('reminder=true');
      expect(logs.messages[0]).does.not.contain('123456');
    } finally {
      logs.restore();
      telegram.restore();
    }
  });

  it('warns when telegram rejects a turn notice', async () => {
    const telegram = stubTelegramApi({ok: false, error_code: 403, description: 'Forbidden'});
    const warnings = captureConsole('warn');
    try {
      await withTelegramEnabled(async () => {
        const sent = await sendTurnNotice({
          name: 'Руслан',
          id: 'p-ruslan',
          telegramID: '123456',
          lastNoticeMessageId: -1,
          game: {
            id: 'g-telegram',
            generation: 1,
            phase: 'action',
            players: [],
          },
        }, 'turn-key');

        expect(sent).eq(false);
      });

      expect(warnings.messages).has.length(1);
      expect(warnings.messages[0]).contains('Telegram turn notice failed');
      expect(warnings.messages[0]).contains('game=g-telegram');
      expect(warnings.messages[0]).contains('player=p-ruslan');
      expect(warnings.messages[0]).contains('code=403');
      expect(warnings.messages[0]).contains('Forbidden');
      expect(warnings.messages[0]).does.not.contain('123456');
    } finally {
      warnings.restore();
      telegram.restore();
    }
  });

  it('logs successful game start notice sends without telegram chat id', async () => {
    const telegram = stubTelegramApi({ok: true, result: {message_id: 456}});
    const logs = captureConsole('log');
    try {
      await withTelegramEnabled(async () => {
        const sent = await sendGameStartNotice({
          name: 'Руслан',
          id: 'p-ruslan',
          telegramID: '123456',
          lastNoticeMessageId: -1,
          game: {
            id: 'g-telegram',
            generation: 1,
            phase: 'initial_drafting',
            players: [],
          },
        });

        expect(sent).eq(true);
      });

      const sendCalls = telegram.calls.filter((call) => call.path.includes('/sendMessage'));
      expect(sendCalls).has.length(1);
      expect(sendCalls[0].body.text).contains('/player?id=p-ruslan');
      expect(sendCalls[0].body.text).not.contain('#botTakeoverToken=');
      expect(logs.messages).has.length(1);
      expect(logs.messages[0]).contains('Telegram start notice sent');
      expect(logs.messages[0]).contains('game=g-telegram');
      expect(logs.messages[0]).contains('player=p-ruslan');
      expect(logs.messages[0]).contains('message=456');
      expect(logs.messages[0]).does.not.contain('123456');
    } finally {
      logs.restore();
      telegram.restore();
    }
  });

  it('keeps legacy game start links bare when no capability exists', async () => {
    const telegram = stubTelegramApi({ok: true, result: {message_id: 457}});
    const logs = captureConsole('log');
    try {
      await withTelegramEnabled(async () => {
        const sent = await sendGameStartNotice({
          name: 'Legacy',
          id: 'p-legacy',
          telegramID: '123456',
          lastNoticeMessageId: -1,
        });
        expect(sent).eq(true);
      });

      const text = telegram.calls[0].body.text as string;
      expect(text).contains('/player?id=p-legacy');
      expect(text).not.contain('#botTakeoverToken=');
    } finally {
      logs.restore();
      telegram.restore();
    }
  });

  it('logs successful bot takeover notice sends without telegram chat id', async () => {
    const telegram = stubTelegramApi({ok: true, result: {message_id: 789}});
    const logs = captureConsole('log');
    try {
      await withTelegramEnabled(async () => {
        const sent = await sendBotTakeoverNotice({
          name: 'Руслан',
          id: 'p-ruslan',
          telegramID: '123456',
          game: {
            id: 'g-telegram',
            generation: 1,
            phase: 'action',
            players: [
              {name: 'Руслан', color: 'red'},
              {name: 'Владлен', color: 'blue'},
            ],
          },
        }, {
          name: 'Владлен',
          id: 'p-vladlen',
        });

        expect(sent).eq(true);
      });

      const sendCalls = telegram.calls.filter((call) => call.path.includes('/sendMessage'));
      expect(sendCalls).has.length(1);
      expect(sendCalls[0].body.chat_id).eq('123456');
      expect(sendCalls[0].body.text).contains('Внимание: бот включен за Владлен.');
      expect(logs.messages).has.length(1);
      expect(logs.messages[0]).contains('Telegram bot takeover notice sent');
      expect(logs.messages[0]).contains('game=g-telegram');
      expect(logs.messages[0]).contains('recipient=p-ruslan');
      expect(logs.messages[0]).contains('botPlayer=p-vladlen');
      expect(logs.messages[0]).contains('message=789');
      expect(logs.messages[0]).does.not.contain('123456');
    } finally {
      logs.restore();
      telegram.restore();
    }
  });

  it('warns when telegram rejects a game start notice', async () => {
    const telegram = stubTelegramApi({ok: false, error_code: 403, description: 'Forbidden'});
    const warnings = captureConsole('warn');
    try {
      await withTelegramEnabled(async () => {
        const sent = await sendGameStartNotice({
          name: 'Руслан',
          id: 'p-ruslan',
          telegramID: '123456',
          lastNoticeMessageId: -1,
          game: {
            id: 'g-telegram',
            generation: 1,
            phase: 'initial_drafting',
            players: [],
          },
        });

        expect(sent).eq(false);
      });

      expect(warnings.messages).has.length(1);
      expect(warnings.messages[0]).contains('Telegram start notice failed');
      expect(warnings.messages[0]).contains('game=g-telegram');
      expect(warnings.messages[0]).contains('player=p-ruslan');
      expect(warnings.messages[0]).contains('code=403');
      expect(warnings.messages[0]).contains('Forbidden');
      expect(warnings.messages[0]).does.not.contain('123456');
    } finally {
      warnings.restore();
      telegram.restore();
    }
  });

  it('warns when game start notice cannot send because telegram token is missing', async () => {
    const original = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    const warnings = captureConsole('warn');
    delete process.env.TM_BOT_TOKEN;
    delete process.env.TM_DISABLE_TELEGRAM;
    try {
      const sent = await sendGameStartNotice({
        name: 'Руслан',
        id: 'p-ruslan',
        telegramID: '123456',
        lastNoticeMessageId: -1,
        game: {
          id: 'g-telegram',
          generation: 1,
          phase: 'initial_drafting',
          players: [],
        },
      });

      expect(sent).eq(false);
      expect(warnings.messages).has.length(1);
      expect(warnings.messages[0]).contains('Telegram start notice skipped');
      expect(warnings.messages[0]).contains('missing TM_BOT_TOKEN');
      expect(warnings.messages[0]).contains('player=p-ruslan');
      expect(warnings.messages[0]).does.not.contain('123456');
    } finally {
      warnings.restore();
      if (original === undefined) {
        delete process.env.TM_BOT_TOKEN;
      } else {
        process.env.TM_BOT_TOKEN = original;
      }
      if (originalDisabled === undefined) {
        delete process.env.TM_DISABLE_TELEGRAM;
      } else {
        process.env.TM_DISABLE_TELEGRAM = originalDisabled;
      }
    }
  });

  it('clears stored turn notice id before best-effort delete', async () => {
    const original = process.env.TM_BOT_TOKEN;
    delete process.env.TM_BOT_TOKEN;
    const player = {
      name: 'Руслан',
      id: 'p-ruslan' as const,
      telegramID: '123456',
      lastNoticeMessageId: 77,
    };
    try {
      await deleteTurnNotice(player);
      expect(player.lastNoticeMessageId).eq(-1);
    } finally {
      if (original === undefined) {
        delete process.env.TM_BOT_TOKEN;
      } else {
        process.env.TM_BOT_TOKEN = original;
      }
    }
  });

  it('deletes a notice from the persistent store when in-memory message id was lost', async () => {
    const telegram = stubTelegramApi({ok: true, result: {message_id: 123}});
    try {
      await withTelegramEnabled(async () => {
        const player = {
          name: 'Руслан',
          id: 'p-ruslan' as const,
          telegramID: '123456',
          lastNoticeMessageId: -1,
          game: {
            id: 'g-telegram',
            generation: 1,
            phase: 'action',
            players: [],
          },
        };

        const sent = await sendTurnNotice(player, 'turn-key');
        expect(sent).eq(true);
        player.lastNoticeMessageId = -1;

        await deleteTurnNotice(player);
      });

      const deleteCalls = telegram.calls.filter((call) => call.path.includes('/deleteMessage'));
      expect(deleteCalls).has.length(1);
      expect(deleteCalls[0].body.message_id).eq(123);
    } finally {
      telegram.restore();
    }
  });

  it('does not resend the same turn notice after in-memory state was lost', async () => {
    const telegram = stubTelegramApi({ok: true, result: {message_id: 123}});
    try {
      await withTelegramEnabled(async () => {
        const player = {
          name: 'Руслан',
          id: 'p-ruslan' as const,
          telegramID: '123456',
          lastNoticeMessageId: -1,
          game: {
            id: 'g-telegram',
            generation: 1,
            phase: 'action',
            players: [],
          },
        };

        const firstSend = await sendTurnNotice(player, 'turn-key');
        player.lastNoticeMessageId = -1;
        const duplicateSend = await sendTurnNotice(player, 'turn-key');

        expect(firstSend).eq(true);
        expect(duplicateSend).eq(false);
        expect(player.lastNoticeMessageId).eq(123);
      });

      const sendCalls = telegram.calls.filter((call) => call.path.includes('/sendMessage'));
      expect(sendCalls).has.length(1);
    } finally {
      telegram.restore();
    }
  });

  it('does not let a stale reminder replace a newer stored turn notice', async () => {
    const telegram = stubTelegramApi({ok: true, result: {message_id: 123}});
    try {
      await withTelegramEnabled(async (storePath) => {
        const storeKey = 'g-telegram:p-ruslan';
        const currentRecord = {
          gameId: 'g-telegram',
          playerId: 'p-ruslan',
          chatId: '123456',
          messageId: 222,
          turnNoticeKey: 'current-key',
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        };
        writeTurnNoticeStore(storePath, storeKey, currentRecord);
        const player = {
          name: 'Руслан',
          id: 'p-ruslan' as const,
          telegramID: '123456',
          lastNoticeMessageId: 77,
          lastTurnNoticeKey: 'stale-key',
          game: {
            id: 'g-telegram',
            generation: 1,
            phase: 'action',
            players: [],
          },
        };

        const sent = await sendTurnNotice(player, 'stale-key', {reminder: true});

        expect(sent).eq(false);
        expect(readTurnNoticeStore(storePath)[storeKey]).deep.eq(currentRecord);
      });

      const sendCalls = telegram.calls.filter((call) => call.path.includes('/sendMessage'));
      const deleteCalls = telegram.calls.filter((call) => call.path.includes('/deleteMessage'));
      expect(sendCalls).has.length(0);
      expect(deleteCalls).has.length(0);
    } finally {
      telegram.restore();
    }
  });

  it('does not send duplicate reminders for a recently updated turn notice', async () => {
    const telegram = stubTelegramApi({ok: true, result: {message_id: 123}});
    try {
      await withTelegramEnabled(async (storePath) => {
        writeTurnNoticeStore(storePath, 'g-telegram:p-ruslan', {
          gameId: 'g-telegram',
          playerId: 'p-ruslan',
          chatId: '123456',
          messageId: 222,
          turnNoticeKey: 'turn-key',
          updatedAt: new Date().toISOString(),
        });
        const player = {
          name: 'Руслан',
          id: 'p-ruslan' as const,
          telegramID: '123456',
          lastNoticeMessageId: 77,
          lastTurnNoticeKey: 'turn-key',
          game: {
            id: 'g-telegram',
            generation: 1,
            phase: 'action',
            players: [],
          },
        };

        const sent = await sendTurnNotice(player, 'turn-key', {reminder: true});

        expect(sent).eq(false);
        expect(player.lastNoticeMessageId).eq(222);
        expect(player.lastTurnNoticeKey).eq('turn-key');
      });

      const sendCalls = telegram.calls.filter((call) => call.path.includes('/sendMessage'));
      const deleteCalls = telegram.calls.filter((call) => call.path.includes('/deleteMessage'));
      expect(sendCalls).has.length(0);
      expect(deleteCalls).has.length(0);
    } finally {
      telegram.restore();
    }
  });
});
