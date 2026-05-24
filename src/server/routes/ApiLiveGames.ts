import * as responses from '../server/responses';
import {Phase} from '../../common/Phase';
import {LiveGameModel} from '../../common/models/LiveGameModel';
import {hasMalformedEscapeVelocityOptions} from '../../common/game/EscapeVelocityOptions';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';

const DEFAULT_LIMIT = 2;
const MAX_LIMIT = 20;
const STALE_LIVE_GAME_AFTER_MS = 18 * 60 * 60 * 1000;

type LiveGameCandidate = {
  phasePriority: number;
  activity: number;
  updatedAtMs: number;
  model: LiveGameModel;
};

function getLimit(rawLimit: string | null): number {
  if (rawLimit === null) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

function phasePriority(phase: Phase): number {
  switch (phase) {
  case Phase.ACTION:
    return 5;
  case Phase.PRODUCTION:
  case Phase.SOLAR:
  case Phase.INTERGENERATION:
    return 4;
  case Phase.RESEARCH:
  case Phase.PRELUDES:
  case Phase.CEOS:
    return 3;
  case Phase.DRAFTING:
    return 2;
  case Phase.INITIALDRAFTING:
    return 1;
  case Phase.END:
    return 0;
  }
}

function hasCustomPlayerName(game: {players: ReadonlyArray<{color: string, name: string}>}): boolean {
  return game.players.some((player) => player.name.trim().toLowerCase() !== player.color.toLowerCase());
}

function isSyntheticTestPlayerName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return /^[a-z]$/.test(normalized) ||
    /^inputlog\d+$/.test(normalized) ||
    /^seq[a-z]$/.test(normalized);
}

function isSyntheticTestGame(game: {players: ReadonlyArray<{name: string}>}): boolean {
  return game.players.length > 0 && game.players.every((player) => isSyntheticTestPlayerName(player.name));
}

function isPreStartDraft(phase: Phase): boolean {
  return phase === Phase.INITIALDRAFTING;
}

function isStale(lastSaveTimeMs: number | undefined, now: number): boolean {
  return lastSaveTimeMs !== undefined && now - lastSaveTimeMs > STALE_LIVE_GAME_AFTER_MS;
}

export class ApiLiveGames extends Handler {
  public static readonly INSTANCE = new ApiLiveGames();

  private constructor() {
    super();
  }

  public override async get(_req: Request, res: Response, ctx: Context): Promise<void> {
    const limit = getLimit(ctx.url.searchParams.get('limit'));
    const now = Date.now();
    const list = await ctx.gameLoader.getIds();
    const liveGames: Array<LiveGameCandidate> = [];

    for (const entry of list) {
      const game = await ctx.gameLoader.getGame(entry.gameId);
      if (game === undefined ||
          game.phase === Phase.END ||
          game.players.length < 2 ||
          !hasCustomPlayerName(game) ||
          isSyntheticTestGame(game) ||
          isPreStartDraft(game.phase) ||
          hasMalformedEscapeVelocityOptions(game.gameOptions.escapeVelocity)) {
        continue;
      }
      const lastSaveTimeMs = await ctx.gameLoader.getLastSaveTimeMs(entry.gameId);
      if (isStale(lastSaveTimeMs, now)) {
        continue;
      }
      const priority = phasePriority(game.phase);
      liveGames.push({
        phasePriority: priority,
        activity: (priority * 1000000) + game.gameAge + game.lastSaveId,
        updatedAtMs: lastSaveTimeMs ?? 0,
        model: {
          id: game.id,
          phase: game.phase,
          players: game.players.map((player) => ({
            color: player.color,
            name: player.name,
          })),
          spectatorId: game.spectatorId,
        },
      });
    }

    const response = liveGames
      .sort((a, b) => (b.updatedAtMs - a.updatedAtMs) || (b.phasePriority - a.phasePriority) || (b.activity - a.activity))
      .slice(0, limit)
      .map((candidate) => candidate.model);
    responses.writeJson(res, ctx, response);
  }
}
