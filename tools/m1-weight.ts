import '../tests/testing/setup';
import {playRandomGame} from '../tests/ai/playRandomGame';
import {chooseResponse} from '../src/server/ai/chooseResponse';
import {setPlayerTuning, clearPlayerTunings} from '../src/server/ai/aiTuning';
import * as fs from 'node:fs';

const [outPath, gamesArg, seedBaseArg] = process.argv.slice(2);
const games = Number(gamesArg);
const seedBase = Number(seedBaseArg);

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

const plan: Array<{size: number, arm: 'ref' | 'cand', base: number}> = [];
for (const size of [3, 4]) {
  for (const arm of ['ref', 'cand'] as const) {
    plan.push({size, arm, base: seedBase + size * 100000 + (arm === 'cand' ? 50000 : 0)});
  }
}

for (const step of plan) {
  for (let g = 0; g < games; g++) {
    const seed = ((step.base + g * 7919) % 1000000) / 1000000;
    const changedSeat = g % step.size;
    const responders: Array<(input: any, player: any) => any> = [];
    for (let s = 0; s < step.size; s++) {
      const variant = (s === changedSeat && step.arm === 'cand') ? 'm1Cand' : 'm1Ref';
      responders.push((input: any, player: any) => {
        setPlayerTuning(player.id, variant);
        return chooseResponse(input, player, 'normal');
      });
    }
    const result = playRandomGame({
      playerCount: step.size,
      gameOptions: {preludeExtension: true},
      maximumGenerations: 30,
      maximumDecisions: 40000,
      maximumAttemptsPerDecision: 200,
      seed,
      random: seededRandom(step.base + g),
      responders,
    });
    clearPlayerTunings();
    const line = JSON.stringify({
      size: step.size,
      arm: step.arm,
      game: g,
      seed,
      changedSeat,
      vp: result.victoryPoints,
      finished: result.finished,
      generations: result.generations,
      seconds: Math.round(result.milliseconds / 1000),
    });
    fs.appendFileSync(outPath, line + '\n');
    console.log(line);
  }
}
