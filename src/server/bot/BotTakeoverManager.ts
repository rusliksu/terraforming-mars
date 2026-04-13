import * as fs from 'fs';
import * as path from 'path';
import {spawn, ChildProcess} from 'child_process';
import {GameId, PlayerId} from '../../common/Types';

export type BotTakeoverEntry = {
  gameId: GameId;
  playerId: PlayerId;
  pid: number | null;
  startedAtMs: number;
  logFile: string;
};

type ManagedBotTakeover = BotTakeoverEntry & {
  child: ChildProcess;
};

type StartBotTakeoverOptions = {
  gameId: GameId;
  playerId: PlayerId;
  pollSeconds?: number;
  serverId: string;
};

type BotTakeoverManagerOptions = {
  now?: () => number;
  spawnProcess?: typeof spawn;
  scriptPath?: string;
  serverUrl?: string;
  logDir?: string;
};

export class BotTakeoverManager {
  public static readonly INSTANCE = new BotTakeoverManager();

  private readonly now: () => number;
  private readonly spawnProcess: typeof spawn;
  private readonly active = new Map<PlayerId, ManagedBotTakeover>();

  constructor(private readonly options: BotTakeoverManagerOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.spawnProcess = options.spawnProcess ?? spawn;
  }

  public list(gameId?: GameId): Array<BotTakeoverEntry> {
    return Array.from(this.active.values())
      .filter((entry) => gameId === undefined || entry.gameId === gameId)
      .map(({child: _child, ...entry}) => entry);
  }

  public listPlayerIds(gameId?: GameId): Array<PlayerId> {
    return this.list(gameId).map((entry) => entry.playerId);
  }

  public isActive(playerId: PlayerId): boolean {
    return this.active.has(playerId);
  }

  public start(options: StartBotTakeoverOptions): BotTakeoverEntry {
    const existing = this.active.get(options.playerId);
    if (existing !== undefined) {
      return this.stripChild(existing);
    }

    const scriptPath = this.resolveScriptPath();
    const logDir = this.resolveLogDir();
    fs.mkdirSync(logDir, {recursive: true});
    const logFile = path.join(logDir, `${options.gameId}-${options.playerId}.log`);
    const logFd = fs.openSync(logFile, 'a');
    let child: ChildProcess;
    try {
      child = this.spawnProcess(
        process.execPath,
        [
          scriptPath,
          options.gameId,
          '--player',
          options.playerId,
          '--server',
          this.resolveServerUrl(),
          '--server-id',
          options.serverId,
          '--poll',
          String(options.pollSeconds ?? 2),
        ],
        {
          cwd: path.dirname(scriptPath),
          env: process.env,
          stdio: ['ignore', logFd, logFd],
        },
      );
    } finally {
      fs.closeSync(logFd);
    }

    const entry: ManagedBotTakeover = {
      child,
      gameId: options.gameId,
      logFile,
      pid: child.pid ?? null,
      playerId: options.playerId,
      startedAtMs: this.now(),
    };
    this.active.set(options.playerId, entry);

    child.once('exit', () => {
      const current = this.active.get(options.playerId);
      if (current?.child === child) {
        this.active.delete(options.playerId);
      }
    });
    child.once('error', () => {
      const current = this.active.get(options.playerId);
      if (current?.child === child) {
        this.active.delete(options.playerId);
      }
    });

    return this.stripChild(entry);
  }

  public stop(playerId: PlayerId): BotTakeoverEntry | undefined {
    const entry = this.active.get(playerId);
    if (entry === undefined) {
      return undefined;
    }
    this.active.delete(playerId);
    entry.child.kill('SIGINT');
    return this.stripChild(entry);
  }

  private stripChild(entry: ManagedBotTakeover): BotTakeoverEntry {
    return {
      gameId: entry.gameId,
      logFile: entry.logFile,
      pid: entry.pid,
      playerId: entry.playerId,
      startedAtMs: entry.startedAtMs,
    };
  }

  private resolveScriptPath(): string {
    const candidates = [
      this.options.scriptPath,
      process.env.TM_AUTO_JOIN_SCRIPT,
      path.resolve(process.cwd(), '..', 'repos', 'tm-tierlist', 'bot', 'auto-join.js'),
      path.resolve(process.cwd(), '..', 'tm-tierlist', 'bot', 'auto-join.js'),
      path.resolve(process.cwd(), 'bot', 'auto-join.js'),
    ].filter((candidate): candidate is string => typeof candidate === 'string' && candidate !== '');

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    throw new Error('auto-join.js not found; set TM_AUTO_JOIN_SCRIPT to the bot script path');
  }

  private resolveServerUrl(): string {
    return this.options.serverUrl ??
      process.env.BOT_TAKEOVER_SERVER_URL ??
      `http://127.0.0.1:${process.env.PORT || '8080'}`;
  }

  private resolveLogDir(): string {
    return this.options.logDir ??
      process.env.BOT_TAKEOVER_LOG_DIR ??
      path.resolve(process.cwd(), 'logs', 'bot-takeover');
  }
}
