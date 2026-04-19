import https from "https";
import {BotTakeoverManager} from './bot/BotTakeoverManager';
import {PlayerId} from '../common/Types';

const SERVER_URL = process.env.TM_SERVER_URL ?? "https://tm.knightbyte.win";
const COLOR_LABELS: Record<string, string> = {
  red: "красный",
  green: "зеленый",
  yellow: "желтый",
  blue: "синий",
  black: "черный",
  purple: "фиолетовый",
  orange: "оранжевый",
  pink: "розовый",
  neutral: "нейтральный",
  bronze: "бронзовый",
};

interface TelegramResponse {
  ok: boolean;
  result?: { message_id: number };
  description?: string;
  error_code?: number;
}

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
      hostname: "api.telegram.org",
      path: `/bot${botToken}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk: string) => (responseData += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          resolve({ok: false});
        }
      });
    });

    req.on("error", (err) => {
      console.warn("Telegram API error:", err.message);
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
  return participants.map((participant) => `${participant.name} (${describeColor(participant.color)})`).join(", ");
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
  parts.push((game.gameOptions?.boardName ?? "mars").toLowerCase());
  parts.push(`${game.players.length}P`);
  return parts.join(" · ");
}

export function buildTurnNoticeText(player: TelegramNotifiable): string {
  const lines = ['Твой ход!'];
  const gameSummary = buildGameSummary(player);
  if (gameSummary !== undefined) {
    lines.push(gameSummary);
  }
  const participantsSummary = buildParticipantsSummary(player);
  if (participantsSummary !== undefined) {
    lines.push(`Игроки: ${participantsSummary}`);
  }
  lines.push(`${SERVER_URL}/player?id=${player.id}`);
  return lines.join("\n");
}

export async function sendTurnNotice(player: TelegramNotifiable, turnNoticeKey?: string): Promise<boolean> {
  if (!player.telegramID) return false;
  if (telegramDisabled()) return false;
  if (!getBotToken()) return false;
  if (BotTakeoverManager.INSTANCE.isActive(player.id)) return false;
  try {
    const resp = await callTelegramApi("sendMessage", {
      chat_id: player.telegramID,
      text: buildTurnNoticeText(player),
    });
    if (resp.ok && resp.result) {
      player.lastNoticeMessageId = resp.result.message_id;
      if (turnNoticeKey !== undefined) {
        player.lastTurnNoticeKey = turnNoticeKey;
      }
      return true;
    }
  } catch (err) {
    console.warn("sendTurnNotice error:", err);
  }
  return false;
}

export async function deleteTurnNotice(player: TelegramNotifiable): Promise<void> {
  if (!player.telegramID || player.lastNoticeMessageId < 0) return;
  if (telegramDisabled()) return;
  if (!getBotToken()) return;
  try {
    await callTelegramApi("deleteMessage", {
      chat_id: player.telegramID,
      message_id: player.lastNoticeMessageId,
    });
    player.lastNoticeMessageId = -1;
  } catch (err) {
    console.warn("deleteTurnNotice error:", err);
  }
}

export async function sendGameStartNotice(player: TelegramNotifiable): Promise<void> {
  if (!player.telegramID) return;
  if (telegramDisabled()) return;
  if (!getBotToken()) return;
  const link = `${SERVER_URL}/player?id=${player.id}`;
  try {
    await callTelegramApi("sendMessage", {
      chat_id: player.telegramID,
      text: `${player.name}, new game start! 🚀\nYour link: ${link}`,
      parse_mode: "HTML",
    });
  } catch (err) {
    console.warn("sendGameStartNotice error:", err);
  }
}
