#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadLegacyEloApi() {
  const file = path.join(__dirname, 'elo-api.js');
  const code = fs.readFileSync(file, 'utf8');
  const sandbox = {
    console: {log() {}, warn() {}, error() {}},
    __dirname: __dirname,
    __filename: file,
    module: {exports: {}},
    exports: {},
    process: {env: {}},
    Buffer,
    setTimeout,
    clearTimeout,
    require(request) {
      if (request === 'http') {
        return {
          createServer() {
            return {
              listen() {},
            };
          },
        };
      }
      if (request === 'fs') return fs;
      if (request === 'path') return path;
      if (request === './player_name_aliases.json') {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'player_name_aliases.json'), 'utf8'));
      }
      return require(request);
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, {filename: file});
  return sandbox;
}

function testRebuildEloPopulatesDerivedStatsAndPerGameDeltas() {
  const api = loadLegacyEloApi();
  assert.strictEqual(typeof api.rebuildElo, 'function', 'expected rebuildElo() to be defined');

  const data = {
    players: {},
    games: [
      {
        _key: 'g1',
        gameId: 'g1',
        completedTime: 1,
        generation: 9,
        results: [
          {name: 'GydRo', displayName: 'GydRo', place: 1, vp: 100, corp: 'Teractor', oldElo: 0, newElo: 0, delta: 0},
          {name: 'Рав', displayName: 'Рав', place: 2, vp: 92, corp: 'Tharsis Republic', oldElo: 0, newElo: 0, delta: 0},
        ],
      },
      {
        _key: 'g2',
        gameId: 'g2',
        completedTime: 2,
        generation: 10,
        results: [
          {name: 'GydRo', displayName: 'GydRo', place: 1, vp: 125, corp: 'Teractor|Lakefront Resorts', oldElo: 0, newElo: 0, delta: 0},
          {name: 'Рав', displayName: 'Рав', place: 2, vp: 124, corp: 'Tharsis Republic|Sagitta Frontier Services', oldElo: 0, newElo: 0, delta: 0},
          {name: 'Тома', displayName: 'Тома', place: 3, vp: 97, corp: 'Morning Star Inc.|Tycho Magnetics', oldElo: 0, newElo: 0, delta: 0},
        ],
      },
    ],
  };

  api.rebuildElo(data);

  assert.strictEqual(data.players.gydro.totalGens, 19, 'winner should accumulate generation totals');
  assert.strictEqual(data.players.gydro.avgGens, 9.5, 'winner should expose avg generation');
  assert.strictEqual(data.players.gydro.totalMargin, 9, 'winner should accumulate VP margins');
  assert.strictEqual(data.players.gydro.avgMargin, 4.5, 'winner should expose avg VP margin');

  const finalGame = data.games[1];
  assert(finalGame.results[0].delta > 0, 'winner delta should be positive in recent games');
  assert.notStrictEqual(finalGame.results[1].delta, 0, 'second place delta should be persisted for recent games');
  assert(finalGame.results[2].delta < 0, 'last place delta should be negative in recent games');
  assert(finalGame.results.every((entry) => entry.oldElo !== 0 || entry.newElo !== 0), 'recent game should persist non-zero elo snapshots');
}

testRebuildEloPopulatesDerivedStatsAndPerGameDeltas();
console.log('legacy elo api regressions: OK');
