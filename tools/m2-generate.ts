import '../tests/testing/setup';
import {playRandomGame} from '../tests/ai/playRandomGame';
import {randomResponse} from '../src/server/ai/randomResponse';
import {chooseResponse} from '../src/server/ai/chooseResponse';
import {setPlayerTuning, clearPlayerTunings} from '../src/server/ai/aiTuning';
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';

const [outDir, gamesArg, sizeArg, policyArg, seedBaseArg] = process.argv.slice(2);
const games = Number(gamesArg);
const size = Number(sizeArg);
const policy = policyArg;
const seedBase = Number(seedBaseArg);

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

fs.mkdirSync(outDir, {recursive: true});
for (let g = 0; g < games; g++) {
  const seed = ((seedBase + g * 7919) % 1000000) / 1000000;
  const snaps: Array<{gen: number, saveId: number, state: any}> = [];
  let lastGen = 0;
  const responders = policy === 'ai' ? Array.from({length: size}, () => (input: any, player: any) => {
    setPlayerTuning(player.id, 'm1Ref');
    return chooseResponse(input, player, 'normal');
  }) : undefined;
  const result = playRandomGame({
    playerCount: size,
    gameOptions: {preludeExtension: true},
    maximumGenerations: 30,
    maximumDecisions: 40000,
    maximumAttemptsPerDecision: 200,
    seed,
    random: seededRandom(seedBase + g),
    responders,
    onDecision: (game: any) => {
      if (game.generation !== lastGen) {
        lastGen = game.generation;
        snaps.push({gen: game.generation, saveId: snaps.length + 1, state: game.serialize()});
      }
    },
  });
  clearPlayerTunings();
  const id = 'm2-' + size + 'p-' + policy + '-' + (seedBase + g);
  if (fs.existsSync(outDir + '/' + id + '.json.gz')) { console.log('skip ' + id); continue; }
  const data = {
    gameId: id,
    players: size,
    scores: result.victoryPoints,
    options: {prelude: true, colonies: false},
    generations: result.generations,
    snaps,
  };
  fs.writeFileSync(outDir + '/' + id + '.json.gz', zlib.gzipSync(JSON.stringify(data)));
  console.log(JSON.stringify({id, size, policy, gen: result.generations, finished: result.finished, vp: result.victoryPoints, snaps: snaps.length, sec: Math.round(result.milliseconds / 1000)}));
}
