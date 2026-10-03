import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {runChecks} from './verify.mjs';

const artifactRoot = 'D:/tm-db/smartbot-lab/fanmade-port-01M3J328-final';
mkdirSync(artifactRoot, {recursive: true});
const outputDir = mkdtempSync(path.join(artifactRoot, 'runner-contract-'));
const check = (name, code) => ({name, command: process.execPath, args: ['-e', code]});
const options = {cwd: outputDir, outputDir};

const failed = runChecks([check('success', 'process.exit(0)'), check('failure', 'process.exit(7)'),
  check('unreached', 'process.exit(0)')], options);
assert.equal(failed.passed, false);
assert.deepEqual(failed.results.map(result => result.exitCode), [0, 7]);
assert.deepEqual(failed.notRun, ['unreached']);
const timedOut = runChecks([check('timeout', 'setInterval(() => {}, 1000)')], {...options, timeout: 100});
assert.equal(timedOut.passed, false);
assert.equal(timedOut.results[0].error, 'ETIMEDOUT');
assert.equal(runChecks([{name: 'missing', command: path.join(outputDir, 'absent-command'), args: []}], options).passed, false);
assert.equal(runChecks([check('all-success', 'process.exit(0)')], options).passed, true);
const colonNames = runChecks(['build:test', 'test:server', 'test:client']
  .map(name => check(name, 'console.log("normal log")')), options);
assert.equal(colonNames.passed, true);
for (const result of colonNames.results) {
  assert.equal(path.basename(result.log).includes(':'), false);
  assert.equal(statSync(result.log).isFile(), true);
  assert.match(readFileSync(result.log, 'utf8'), /normal log/);
}
console.log('verification runner exit, timeout and spawn-failure contracts: PASS');
