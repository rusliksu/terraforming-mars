import {expect} from 'chai';
import {BotTakeoverManager} from '../../src/server/bot/BotTakeoverManager';
import {buildTurnNoticeText, sendTurnNotice} from '../../src/server/TelegramBot';

describe('TelegramBot', () => {
  it('builds a useful turn notice with link and participants', () => {
    const text = buildTurnNoticeText({
      name: 'Руслан',
      id: 'p-ruslan',
      telegramID: '123456',
      lastNoticeMessageId: -1,
      game: {
        id: 'g5d00c8e62c26',
        generation: 8,
        players: [
          {name: 'Руслан', color: 'red'},
          {name: 'Паша', color: 'blue'},
          {name: 'Олеся', color: 'green'},
        ],
        gameOptions: {boardName: 'ELYSIUM'},
      },
    });

    expect(text).includes('Руслан, твой ход! 🪐');
    expect(text).includes('https://tm.knightbyte.win/player?id=p-ruslan');
    expect(text).includes('Игра: g5d00c8e62c26 · Gen 8 · ELYSIUM · 3P');
    expect(text).includes('Игроки: Руслан (красный), Паша (синий), Олеся (зеленый)');
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
});
