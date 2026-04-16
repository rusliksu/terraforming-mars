import https from "https";

const BOT_TOKEN = process.env.TM_BOT_TOKEN ?? "8625024007:AAH-dOu2syBcQB4f28O1wzzgoCROFjNnRNk";
const SERVER_URL = process.env.TM_SERVER_URL ?? "https://tm.knightbyte.win";

interface TelegramResponse {
  ok: boolean;
  result?: { message_id: number };
}

function callTelegramApi(method: string, body: object): Promise<TelegramResponse> {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
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
  id: string;
  telegramID: string;
  lastNoticeMessageId: number;
}

export async function sendTurnNotice(player: TelegramNotifiable): Promise<void> {
  if (!player.telegramID) return;
  try {
    const resp = await callTelegramApi("sendMessage", {
      chat_id: player.telegramID,
      text: `${player.name}, твой ход! 🪐`,
      parse_mode: "HTML",
    });
    if (resp.ok && resp.result) {
      player.lastNoticeMessageId = resp.result.message_id;
    }
  } catch (err) {
    console.warn("sendTurnNotice error:", err);
  }
}

export async function deleteTurnNotice(player: TelegramNotifiable): Promise<void> {
  if (!player.telegramID || player.lastNoticeMessageId < 0) return;
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
