import {expect} from 'chai';
import {EventEmitter} from 'events';
import https from 'https';
import {BotTakeoverManager} from '../../src/server/bot/BotTakeoverManager';
import {buildTurnNoticeText, deleteTurnNotice, sendTurnNotice} from '../../src/server/TelegramBot';

describe('TelegramBot', () => {
  function withTelegramEnabled<T>(fn: () => Promise<T>): Promise<T> {
    const originalToken = process.env.TM_BOT_TOKEN;
    const originalDisabled = process.env.TM_DISABLE_TELEGRAM;
    process.env.TM_BOT_TOKEN = 'token';
    delete process.env.TM_DISABLE_TELEGRAM;
    return fn().finally(() => {
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
    });
  }

  function stubTelegramApi(response: object): {restore: () => void} {
    const originalRequest = https.request;
    (https as any).request = (_options: object, cb: (res: EventEmitter) => void) => {
      const req = new EventEmitter() as any;
      req.write = () => {};
      req.end = () => {
        const res = new EventEmitter();
        cb(res);
        res.emit('data', JSON.stringify(response));
        res.emit('end');
      };
      return req;
    };
    return {
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
    delete process.env.TM_BOT_TOKEN;
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
        delete process.env.TM_BOT_TOKEN;
      } else {
        process.env.TM_BOT_TOKEN = original;
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

  it('clears stored turn notice id before best-effort delete', async () => {
    const original = process.env.TM_BOT_TOKEN;
    delete process.env.TM_BOT_TOKEN;
    const player = {
      name: 'Руслан',
      id: 'p-ruslan',
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
});
