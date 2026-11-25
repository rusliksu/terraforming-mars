import '../tests/testing/setup';
import {Game} from '../src/server/Game';
import {chooseResponse} from '../src/server/ai/chooseResponse';
import {runInSandbox} from '../src/server/ai/simulationSandbox';
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';

const STATES_DIR = 'D:/tm-db/ml/prod-arch/states';
const N = 20;

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
  try { return fn(); } finally { Math.random = original; }
}

function deserialize(state: any): Game {
  return runInSandbox(() => Game.deserialize(state)) as Game;
}

function permuteOpponentHands(game: Game, playerIndex: number): void {
  const others = game.players.filter((_, i) => i !== playerIndex);
  if (others.length < 2) return;
  const hands = others.map((o) => o.cardsInHand);
  others.forEach((o, i) => { o.cardsInHand = hands[(i + 1) % hands.length]; });
}

function reverseDeck(game: Game): void {
  game.projectDeck.drawPile.reverse();
}

function act(game: Game, playerId: string, seed: number): string | undefined {
  const index = game.players.findIndex((p) => p.id === playerId);
  if (index < 0) return undefined;
  const player = game.players[index];
  const input = player.getWaitingFor();
  if (input === undefined) return undefined;
  return withSeededRandom(seed, () => JSON.stringify(chooseResponse(input, player, 'normal')));
}

const files = fs.readdirSync(STATES_DIR).filter((f) => f.endsWith('.json.gz')).sort();
const snaps: any[] = [];
for (const f of files) {
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(STATES_DIR + '/' + f)) as unknown as Buffer);
  for (const snap of data.snaps ?? []) {
    const n = Array.isArray(snap.state?.players) ? snap.state.players.length : 0;
    if (n === 3 || n === 4) snaps.push({game: data.gameId, snap});
  }
}

const counts = {control: 0, hands: 0, deck: 0, both: 0, checked: 0, errors: 0};
for (let i = 0; i < N; i++) {
  const {snap} = snaps[(i * 97) % snaps.length];
  try {
    const base = deserialize(snap.state);
    const player = base.activePlayer;
    const pid = player.id;
    const seed = 777 + i;
    const before = act(base, pid, seed);
    if (before === undefined) continue;
    counts.checked++;

    const ctl = deserialize(snap.state);
    (act(ctl, pid, seed) === before) || counts.control++;

    const handsGame = deserialize(snap.state);
    permuteOpponentHands(handsGame, handsGame.players.findIndex((p) => p.id === pid));
    (act(handsGame, pid, seed) === before) || counts.hands++;

    const deckGame = deserialize(snap.state);
    reverseDeck(deckGame);
    (act(deckGame, pid, seed) === before) || counts.deck++;

    const bothGame = deserialize(snap.state);
    permuteOpponentHands(bothGame, bothGame.players.findIndex((p) => p.id === pid));
    reverseDeck(bothGame);
    (act(bothGame, pid, seed) === before) || counts.both++;
  } catch (e) {
    counts.errors++;
  }
  console.log('done', i, JSON.stringify(counts));
}
fs.mkdirSync('D:/tm-db/ml/m0b', {recursive: true});
fs.writeFileSync('D:/tm-db/ml/m0b/attribution.json', JSON.stringify(counts, null, 2));
console.log(JSON.stringify(counts));
