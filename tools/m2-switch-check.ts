import '../tests/testing/setup';
import {Game} from '../src/server/Game';
import {bgaMultiplayerMargin} from '../src/server/ai/bgaValueModel';
import {setPlayerTuning} from '../src/server/ai/aiTuning';
import {runInSandbox} from '../src/server/ai/simulationSandbox';
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';

const dir = 'D:/tm-db/ml/prod-arch/states';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json.gz')).sort();
for (const f of files) {
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(dir + '/' + f)) as unknown as Buffer);
  const snap = (data.snaps ?? [])[4];
  if (!snap) continue;
  const game = runInSandbox(() => Game.deserialize(snap.state, {viewOnly: true})) as any;
  if (game.players.length !== 3) continue;
  const p = game.players[0];
  setPlayerTuning(p.id, 'm2Ref');
  const a = bgaMultiplayerMargin(p);
  setPlayerTuning(p.id, 'm2Cand');
  const b = bgaMultiplayerMargin(p);
  setPlayerTuning(p.id, 'm2Ref');
  console.log(JSON.stringify({game: data.gameId, ref: a, cand: b}));
  break;
}
