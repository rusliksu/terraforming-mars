import '../tests/testing/setup';
import {Game} from '../src/server/Game';
import {playerValue, valuationContext} from '../src/server/ai/stateValue';
import {chooseResponse} from '../src/server/ai/chooseResponse';
import {runInSandbox} from '../src/server/ai/simulationSandbox';
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';

const STATES_DIR = 'D:/tm-db/ml/prod-arch/states';
const OUT_DIR = 'D:/tm-db/ml/m0b';
const N_LEAK = 150;
const N_ACTION = 50;
const N_LATENCY = 500;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withSeededRandom<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function deserialize(state: any): Game {
  return runInSandbox(() => Game.deserialize(state)) as Game;
}

function permuteOpponentHands(game: Game, playerIndex: number): void {
  const others = game.players.filter((_, i) => i !== playerIndex);
  if (others.length < 2) {
    return;
  }
  const hands = others.map((o) => o.cardsInHand);
  others.forEach((o, i) => {
    o.cardsInHand = hands[(i + 1) % hands.length];
  });
}

function reverseDeck(game: Game): void {
  game.projectDeck.drawPile.reverse();
}

const files = fs.readdirSync(STATES_DIR).filter((f) => f.endsWith('.json.gz')).sort();
const snapshots: Array<{game: string, snap: any}> = [];
for (const f of files) {
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(STATES_DIR + '/' + f)) as unknown as Buffer);
  for (const snap of data.snaps ?? []) {
    const n = Array.isArray(snap.state?.players) ? snap.state.players.length : 0;
    if (n === 3 || n === 4) {
      snapshots.push({game: data.gameId, snap});
    }
  }
}
console.log('snapshots', snapshots.length);

const stateDiffs: any[] = [];
let stateChecked = 0, stateErrors = 0;
for (let i = 0; i < Math.min(N_LEAK, snapshots.length); i++) {
  const {game: gameId, snap} = snapshots[(i * 7) % snapshots.length];
  try {
    const base = deserialize(snap.state);
    const ctx = valuationContext(base);
    const baseValues = base.players.map((p) => playerValue(p, ctx));
    for (let pi = 0; pi < base.players.length; pi++) {
      try {
        const modified = deserialize(snap.state);
        permuteOpponentHands(modified, pi);
        const mctx = valuationContext(modified);
        const after = playerValue(modified.players[pi], mctx);
        stateChecked++;
        if (after !== baseValues[pi]) {
          stateDiffs.push({game: gameId, gen: snap.gen, player: base.players[pi].id, before: baseValues[pi], after});
        }
      } catch (e) {
        stateErrors++;
      }
    }
  } catch (e) {
    stateErrors++;
  }
  if (i % 25 === 0) console.log('state', i, 'checked', stateChecked, 'diffs', stateDiffs.length, 'errors', stateErrors);
}

const deckDiffs: any[] = [];
let deckChecked = 0, deckErrors = 0;
for (let i = 0; i < Math.min(N_LEAK, snapshots.length); i++) {
  const {game: gameId, snap} = snapshots[(i * 11) % snapshots.length];
  try {
    const base = deserialize(snap.state);
    const ctx = valuationContext(base);
    const baseValues = base.players.map((p) => playerValue(p, ctx));
    const modified = deserialize(snap.state);
    reverseDeck(modified);
    const mctx = valuationContext(modified);
    for (let pi = 0; pi < modified.players.length; pi++) {
      deckChecked++;
      const after = playerValue(modified.players[pi], mctx);
      if (after !== baseValues[pi]) {
        deckDiffs.push({game: gameId, gen: snap.gen, player: modified.players[pi].id, before: baseValues[pi], after});
      }
    }
  } catch (e) {
    deckErrors++;
  }
}
console.log('deck checked', deckChecked, 'diffs', deckDiffs.length, 'errors', deckErrors);

const actionDiffs: any[] = [];
let actionChecked = 0, actionErrors = 0;
for (let i = 0; i < Math.min(N_ACTION, snapshots.length); i++) {
  const {game: gameId, snap} = snapshots[(i * 13) % snapshots.length];
  try {
    const base = deserialize(snap.state);
    const player = base.activePlayer;
    const input = player.getWaitingFor();
    if (input === undefined) continue;
    const before = withSeededRandom(12345 + i, () => JSON.stringify(chooseResponse(input, player, 'normal')));
    const modified = deserialize(snap.state);
    const mIndex = modified.players.findIndex((p) => p.id === player.id);
    if (mIndex < 0) continue;
    permuteOpponentHands(modified, mIndex);
    reverseDeck(modified);
    const mplayer = modified.players[mIndex];
    const minput = mplayer.getWaitingFor();
    if (minput === undefined) continue;
    const after = withSeededRandom(12345 + i, () => JSON.stringify(chooseResponse(minput, mplayer, 'normal')));
    actionChecked++;
    if (before !== after) {
      actionDiffs.push({game: gameId, gen: snap.gen, player: player.id, before: before.slice(0, 160), after: after.slice(0, 160)});
    }
  } catch (e) {
    actionErrors++;
  }
}
console.log('action checked', actionChecked, 'diffs', actionDiffs.length, 'errors', actionErrors);

const latencies: number[] = [];
let latencyErrors = 0;
for (let i = 0; i < Math.min(N_LATENCY, snapshots.length); i++) {
  const {snap} = snapshots[(i * 17) % snapshots.length];
  try {
    const game = deserialize(snap.state);
    const player = game.activePlayer;
    const input = player.getWaitingFor();
    if (input === undefined) continue;
    const t0 = performance.now();
    chooseResponse(input, player, 'normal');
    latencies.push(performance.now() - t0);
  } catch (e) {
    latencyErrors++;
  }
  if (i % 100 === 0) console.log('latency', i, latencies.length);
}
latencies.sort((a, b) => a - b);
const pct = (p: number) => latencies.length === 0 ? 0 : latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))];
const mean = latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length);

const result = {
  snapshots: snapshots.length,
  stateValue: {checked: stateChecked, errors: stateErrors, diffs: stateDiffs.length, examples: stateDiffs.slice(0, 5)},
  deck: {checked: deckChecked, errors: deckErrors, diffs: deckDiffs.length, examples: deckDiffs.slice(0, 5)},
  action: {checked: actionChecked, errors: actionErrors, diffs: actionDiffs.length, examples: actionDiffs.slice(0, 5)},
  latency: {
    n: latencies.length,
    errors: latencyErrors,
    meanMs: Math.round(mean * 10) / 10,
    p50Ms: Math.round(pct(0.5) * 10) / 10,
    p95Ms: Math.round(pct(0.95) * 10) / 10,
    p99Ms: Math.round(pct(0.99) * 10) / 10,
    maxMs: latencies.length ? Math.round(latencies[latencies.length - 1] * 10) / 10 : 0,
  },
};
fs.mkdirSync(OUT_DIR, {recursive: true});
fs.writeFileSync(OUT_DIR + '/results.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
