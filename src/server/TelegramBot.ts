import https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import {BotTakeoverManager} from './bot/BotTakeoverManager';
import {PlayerId} from '../common/Types';

const SERVER_URL = process.env.TM_SERVER_URL ?? 'https://tm.knightbyte.win';
const COLOR_LABELS: Record<string, string> = {
  red: 'красный',
  green: 'зеленый',
  yellow: 'желтый',
  blue: 'синий',
  black: 'черный',
  purple: 'фиолетовый',
  orange: 'оранжевый',
  pink: 'розовый',
  gold: 'золотой',
  emerald: 'изумрудный',
  ginger: 'рыжий',
  hydro: 'кораллово-розовый',
  pearl: 'перламутровый',
  antistress: 'темно-синий',
  gambit: 'голубой',
  turquoise: 'коралловый',
  vanger: 'чисто-зеленый',
  serge: 'бордовый',
  saturnstorm: 'красно-розовый',
  neutral: 'нейтральный',
  bronze: 'бронзовый',
};

interface TelegramResponse {
  ok: boolean;
  result?: { message_id: number } | boolean;
  description?: string;
  error_code?: number;
}

interface TurnNoticeOptions {
  reminder?: boolean;
}

type TurnNoticeStoreRecord = {
  gameId: string;
  playerId: PlayerId;
  chatId: string;
  messageId: number;
  turnNoticeKey?: string;
  updatedAt: string;
};

type TurnNoticeStore = Record<string, TurnNoticeStoreRecord>;

function telegramDisabled(): boolean {
  return process.env.TM_DISABLE_TELEGRAM === '1';
}

function getBotToken(): string | undefined {
  const token = process.env.TM_BOT_TOKEN?.trim();
  return token ? token : undefined;
}

function callTelegramApi(method: string, body: object): Promise<TelegramResponse> {
  return new Promise((resolve) => {
    const botToken = getBotToken();
    if (!botToken) {
      resolve({ok: false});
      return;
    }
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk: string) => (responseData += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          resolve({ok: false});
        }
      });
    });

    req.on('error', (err) => {
      console.warn('Telegram API error:', err.message);
      resolve({ok: false});
    });

    req.write(data);
    req.end();
  });
}

export interface TelegramNotifiable {
  name: string;
  id: PlayerId;
  telegramID: string;
  lastNoticeMessageId: number;
  lastTurnNoticeKey?: string;
  game?: {
    id: string;
    generation: number;
    phase?: string;
    players: ReadonlyArray<{name: string; color: string}>;
    gameOptions?: {boardName?: string};
  };
}

function describeColor(color: string): string {
  return COLOR_LABELS[color] ?? color;
}

function buildParticipantsSummary(player: TelegramNotifiable): string | undefined {
  const participants = player.game?.players ?? [];
  if (participants.length === 0) {
    return undefined;
  }
  return participants.map((participant) => `${participant.name} (${describeColor(participant.color)})`).join(', ');
}

function shortGameId(gameId: string): string {
  return gameId.length > 8 ? gameId.slice(0, 8) : gameId;
}

function buildGameSummary(player: TelegramNotifiable): string | undefined {
  const game = player.game;
  if (game === undefined) {
    return undefined;
  }

  const parts = [`Игра ${shortGameId(game.id)}`, `Gen ${game.generation}`];
  if (game.phase) {
    parts.push(game.phase);
  }
  parts.push((game.gameOptions?.boardName ?? 'mars').toLowerCase());
  parts.push(`${game.players.length}P`);
  return parts.join(' · ');
}

function gameIdForLog(player: TelegramNotifiable): string {
  return player.game?.id ?? 'unknown';
}

function turnNoticeStoreKey(player: TelegramNotifiable): string {
  return `${gameIdForLog(player)}:${player.id}`;
}

function turnNoticeStorePath(): string {
  return process.env.TM_TURN_NOTICE_STORE?.trim() || path.resolve(process.cwd(), 'db', 'telegram-turn-notices.json');
}

function readTurnNoticeStore(): TurnNoticeStore {
  const storePath = turnNoticeStorePath();
  try {
    if (!fs.existsSync(storePath)) {
      return {};
    }
    const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as TurnNoticeStore;
    }
  } catch (err) {
    console.warn('Telegram turn notice store read failed:', err instanceof Error ? err.message : String(err));
  }
  return {};
}

function writeTurnNoticeStore(store: TurnNoticeStore): void {
  const storePath = turnNoticeStorePath();
  try {
    fs.mkdirSync(path.dirname(storePath), {recursive: true});
    const tmpPath = `${storePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2));
    fs.renameSync(tmpPath, storePath);
  } catch (err) {
    console.warn('Telegram turn notice store write failed:', err instanceof Error ? err.message : String(err));
  }
}

function getStoredTurnNotice(player: TelegramNotifiable): TurnNoticeStoreRecord | undefined {
  return readTurnNoticeStore()[turnNoticeStoreKey(player)];
}

export function getStoredTurnNoticeUpdatedAt(player: TelegramNotifiable, turnNoticeKey: string): number | undefined {
  const storedNotice = getStoredTurnNotice(player);
  if (storedNotice?.turnNoticeKey !== turnNoticeKey) {
    return undefined;
  }
  const updatedAt = Date.parse(storedNotice.updatedAt);
  return Number.isFinite(updatedAt) ? updatedAt : undefined;
}

function rememberTurnNotice(player: TelegramNotifiable, messageId: number, turnNoticeKey: string | undefined): void {
  const store = readTurnNoticeStore();
  store[turnNoticeStoreKey(player)] = {
    gameId: gameIdForLog(player),
    playerId: player.id,
    chatId: player.telegramID,
    messageId,
    turnNoticeKey,
    updatedAt: new Date().toISOString(),
  };
  writeTurnNoticeStore(store);
}

function forgetTurnNotice(player: TelegramNotifiable, messageId?: number): void {
  const store = readTurnNoticeStore();
  const key = turnNoticeStoreKey(player);
  const stored = store[key];
  if (stored === undefined) {
    return;
  }
  if (messageId !== undefined && stored.messageId !== messageId) {
    return;
  }
  delete store[key];
  writeTurnNoticeStore(store);
}

function logTurnNoticeSent(
  player: TelegramNotifiable,
  messageId: number,
  turnNoticeKey: string | undefined,
  options: TurnNoticeOptions,
): void {
  console.log(
    `Telegram turn notice sent game=${gameIdForLog(player)} player=${player.id} message=${messageId} ` +
    `reminder=${options.reminder === true} key=${turnNoticeKey ?? ''}`,
  );
}

function warnTurnNoticeFailed(
  player: TelegramNotifiable,
  response: TelegramResponse,
  turnNoticeKey: string | undefined,
  options: TurnNoticeOptions,
): void {
  console.warn(
    `Telegram turn notice failed game=${gameIdForLog(player)} player=${player.id} ` +
    `code=${response.error_code ?? 'unknown'} description=${response.description ?? 'unknown'} ` +
    `reminder=${options.reminder === true} key=${turnNoticeKey ?? ''}`,
  );
}

function logGameStartNoticeSent(player: TelegramNotifiable, messageId: number | undefined): void {
  console.log(
    `Telegram start notice sent game=${gameIdForLog(player)} player=${player.id} ` +
    `message=${messageId ?? 'unknown'}`,
  );
}

function warnGameStartNoticeFailed(player: TelegramNotifiable, response: TelegramResponse): void {
  console.warn(
    `Telegram start notice failed game=${gameIdForLog(player)} player=${player.id} ` +
    `code=${response.error_code ?? 'unknown'} description=${response.description ?? 'unknown'}`,
  );
}

export function buildTurnNoticeText(player: TelegramNotifiable, options: TurnNoticeOptions = {}): string {
  const lines = [options.reminder === true ? 'Напоминание: твой ход!' : 'Твой ход!'];
  const gameSummary = buildGameSummary(player);
  if (gameSummary !== undefined) {
    lines.push(gameSummary);
  }
  const participantsSummary = buildParticipantsSummary(player);
  if (participantsSummary !== undefined) {
    lines.push(`Игроки: ${participantsSummary}`);
  }
  lines.push(`${SERVER_URL}/player?id=${player.id}`);
  return lines.join('\n');
}

async function deleteTelegramMessage(chatId: string, messageId: number): Promise<void> {
  await callTelegramApi('deleteMessage', {
    chat_id: chatId,
    message_id: messageId,
  });
}

export async function sendTurnNotice(
  player: TelegramNotifiable,
  turnNoticeKey?: string,
  options: TurnNoticeOptions = {},
): Promise<boolean> {
  if (!player.telegramID) {
    return false;
  }
  if (telegramDisabled()) {
    return false;
  }
  if (!getBotToken()) {
    return false;
  }
  if (BotTakeoverManager.INSTANCE.isActive(player.id)) {
    return false;
  }
  const storedNotice = getStoredTurnNotice(player);
  if (options.reminder !== true && turnNoticeKey !== undefined && storedNotice?.turnNoticeKey === turnNoticeKey) {
    player.lastNoticeMessageId = storedNotice.messageId;
    player.lastTurnNoticeKey = turnNoticeKey;
    return false;
  }
  try {
    const resp = await callTelegramApi('sendMessage', {
      chat_id: player.telegramID,
      text: buildTurnNoticeText(player, options),
    });
    const messageId = typeof resp.result === 'object' ? resp.result.message_id : undefined;
    if (resp.ok && messageId !== undefined) {
      player.lastNoticeMessageId = messageId;
      if (turnNoticeKey !== undefined) {
        player.lastTurnNoticeKey = turnNoticeKey;
      }
      rememberTurnNotice(player, messageId, turnNoticeKey);
      if (storedNotice !== undefined && storedNotice.turnNoticeKey !== turnNoticeKey && storedNotice.messageId !== messageId) {
        await deleteTelegramMessage(storedNotice.chatId, storedNotice.messageId);
      }
      logTurnNoticeSent(player, messageId, turnNoticeKey, options);
      return true;
    }
    warnTurnNoticeFailed(player, resp, turnNoticeKey, options);
  } catch (err) {
    console.warn('sendTurnNotice error:', err);
  }
  return false;
}

export async function deleteTurnNoticeMessage(player: TelegramNotifiable, messageId: number): Promise<void> {
  if (!player.telegramID || messageId < 0) {
    return;
  }
  if (telegramDisabled()) {
    return;
  }
  if (!getBotToken()) {
    return;
  }
  forgetTurnNotice(player, messageId);
  try {
    await deleteTelegramMessage(player.telegramID, messageId);
  } catch (err) {
    console.warn('deleteTurnNotice error:', err);
  }
}

export async function deleteTurnNotice(player: TelegramNotifiable): Promise<void> {
  const storedNotice = getStoredTurnNotice(player);
  const messageId = player.lastNoticeMessageId >= 0 ? player.lastNoticeMessageId : storedNotice?.messageId ?? -1;
  player.lastNoticeMessageId = -1;
  if (messageId < 0) {
    return;
  }
  await deleteTurnNoticeMessage(player, messageId);
}

export async function sendGameStartNotice(player: TelegramNotifiable): Promise<boolean> {
  if (!player.telegramID) {
    return false;
  }
  if (telegramDisabled()) {
    return false;
  }
  if (!getBotToken()) {
    return false;
  }
  const link = `${SERVER_URL}/player?id=${player.id}`;
  try {
    const resp = await callTelegramApi('sendMessage', {
      chat_id: player.telegramID,
      text: `${player.name}, new game start! 🚀\nYour link: ${link}`,
      parse_mode: 'HTML',
    });
    const messageId = typeof resp.result === 'object' ? resp.result.message_id : undefined;
    if (resp.ok) {
      logGameStartNoticeSent(player, messageId);
      return true;
    }
    warnGameStartNoticeFailed(player, resp);
  } catch (err) {
    console.warn('sendGameStartNotice error:', err);
  }
  return false;
}
