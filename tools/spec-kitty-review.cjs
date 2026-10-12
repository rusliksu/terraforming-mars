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

const preparation = [
  ['ci'],
  ['run', 'make:static'],
  ['run', 'make:cards'],
  ['run', 'build:tests'],
];
const logFile = outputFile + '.log';
const log = fs.openSync(logFile, 'a');
function run(args) {
  fs.writeSync(log, '\n' + args.join(' ') + '\n');
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    stdio: ['ignore', log, log],
    env: {...process.env, NODE_ENV: 'test'},
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}
function fail(status) {
  fs.closeSync(log);
  if (status !== 0) {
    const details = fs.readFileSync(logFile, 'utf8').split('\n').slice(-120).join('\n');
    console.error(details);
    process.exit(status);
  }
}
for (const args of preparation) {
  const status = run(args);
  if (status !== 0) fail(status);
}

const serverFile = outputFile + '.server.xml';
const clientFile = outputFile + '.client.xml';
// Archive process tests need a bounded allowance beyond Mocha's two-second default.
const serverStatus = run(['run', 'test:server', '--', '--jobs=4', '--timeout=30000', '--reporter=xunit', '--reporter-options=output=' + serverFile]);
const clientStatus = run(['run', 'test:client', '--', '--reporter=junit', '--outputFile=' + clientFile]);
// Preserve both reporters' complete suites, including failures and skipped tests.
const reports = [serverFile, clientFile].map((file) => fs.readFileSync(file, 'utf8').replace(/^\s*<\?xml[^?]*\?>/, ''));
fs.writeFileSync(outputFile, '<testsuites>\n' + reports.join('\n') + '\n</testsuites>\n');
fail(serverStatus || clientStatus);
