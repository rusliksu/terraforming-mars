/* Runs the declared npm checks for a Spec Kitty baseline or review. */
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

if (Number(process.versions.node.split('.')[0]) !== 22) {
  throw new Error('Spec Kitty review requires Node 22.');
}

const outputFile = process.argv[2];
const npmCli = process.env.TM_NPM_CLI;
if (!outputFile || !path.isAbsolute(outputFile)) {
  throw new Error('An absolute JUnit output path is required.');
}
if (process.platform === 'win32' && path.parse(outputFile).root.toLowerCase() !== 'd:\\') {
  throw new Error('Local review evidence must stay on D:.');
}
if (!npmCli || !fs.existsSync(npmCli)) {
  throw new Error('TM_NPM_CLI must identify the installed npm CLI.');
}

const branch = spawnSync('git', ['branch', '--show-current'], {encoding: 'utf8'});
if (branch.status !== 0 || ['main', 'master'].includes(branch.stdout.trim())) {
  throw new Error('Review tests require an owned checkout or detached baseline.');
}

const commands = [
  ['ci'],
  ['run', 'make:json'],
  ['run', 'make:cards'],
  ['run', 'build:tests'],
  ['run', 'test:server'],
  ['run', 'test:client', '--', '--reporter=junit', '--outputFile=' + outputFile],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    stdio: 'inherit',
    env: {...process.env, NODE_ENV: 'test'},
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
