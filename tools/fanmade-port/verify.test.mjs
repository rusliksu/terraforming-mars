import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync} from 'node:fs';
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
console.log('verification runner exit, timeout and spawn-failure contracts: PASS');
