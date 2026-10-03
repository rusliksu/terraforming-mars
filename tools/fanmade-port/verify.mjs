import {spawnSync} from 'node:child_process';
import {closeSync, mkdirSync, openSync, realpathSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const timeoutMs = 10 * 60 * 1000;

/** Records one bounded command's actual exit status, including spawn failure or timeout. */
export function runCheck(check, {cwd, env = process.env, outputDir, timeout = timeoutMs}) {
  const log = path.join(outputDir, check.name + '.log');
  const fd = openSync(log, 'w');
  let child;
  const started = Date.now();
  try {
    child = spawnSync(check.command, check.args, {cwd, env, timeout, stdio: ['ignore', fd, fd], windowsHide: true});
  } finally {
    closeSync(fd);
  }
  return {name: check.name, command: check.command, args: check.args, log,
    exitCode: child.status, signal: child.signal, error: child.error?.code,
    durationMs: Date.now() - started, passed: child.status === 0 && !child.error && !child.signal};
}

/** Stops at the first failed check so an incomplete run cannot appear successful. */
export function runChecks(checks, options) {
  const results = [];
  for (const check of checks) {
    const result = runCheck(check, options);
    results.push(result);
    console.log(`${result.name}: ${result.passed ? 'PASS' : 'FAIL'} (exit ${result.exitCode}, ${result.durationMs}ms)`);
    if (!result.passed) break;
  }
  return {passed: results.length === checks.length && results.every(result => result.passed),
    results, notRun: checks.slice(results.length).map(check => check.name)};
}

const matrixFiles = [
  'tests/fanmade-compat/*.spec.ts',
  'tests/cards/sillyfication/AriAdore.spec.ts', 'tests/cards/sillyfication/CostIndex.spec.ts',
  'tests/cards/betterMars/Replacements.spec.ts', 'tests/cards/DataDrivenCard.spec.ts',
  'tests/cards/conglomerates/teamActions/DonationAction.spec.ts',
  'tests/conglomerates/ConglomeratesExpansion.spec.ts', 'tests/conglomerates/ConglomeratesTeamScore.spec.ts',
  'tests/cards/corporatebetterments/WildBoars.spec.ts',
  'tests/cards/idesofmars/Amphibians.spec.ts', 'tests/cards/idesofmars/Backstabbing.spec.ts',
  'tests/cards/robantilles/AlgorithmicTrading.spec.ts', 'tests/cards/robantilles/GreatFaceOfCydonia.spec.ts',
  'tests/cards/robantilles/DogsInSpace.spec.ts', 'tests/cards/robantilles/GigaInterferometer.spec.ts',
  'tests/MorePartiesCardDraws.spec.ts', 'tests/turmoil/parties/ScientistsMoreParties.spec.ts', 'tests/turmoil/PartySwap.spec.ts',
  'tests/cards/venusPhase2/CloudCityStandardProject.spec.ts', 'tests/venusPhase2/VenusPhase2Expansion.spec.ts',
  'tests/cards/industries/SteelIndustryStandardProject.spec.ts',
  'tests/cards/highOrbit/HighOrbitAcquisition.spec.ts', 'tests/HighOrbitMarket.spec.ts', 'tests/cards/highOrbit/Observatory.spec.ts',
  'tests/cards/solaris/GalaxyDefenders.spec.ts', 'tests/cards/solaris/AntiFraudInvestigation.spec.ts',
];

function main() {
  if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run the combined verification with Node22.');
  const {values} = parseArgs({options: {'output-dir': {type: 'string'}, 'npm-cli': {type: 'string'}}});
  if (!values['output-dir'] || !values['npm-cli']) throw new Error('Required: --output-dir <absolute D: directory> --npm-cli <npm-cli.js>');
  const outputDir = path.resolve(values['output-dir']);
  if (!path.isAbsolute(values['output-dir']) || !/^D:[\\/]/i.test(outputDir)) throw new Error('Artifacts must remain on D:.');
  mkdirSync(outputDir, {recursive: true});
  if (!/^D:[\\/]/i.test(realpathSync(outputDir))) throw new Error('Artifact directory resolves outside D:.');
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {cwd: repoRoot, encoding: 'utf8'});
  if (head.status !== 0) throw new Error('Cannot pin the checkout HEAD.');
  const checks = ['lint', 'build', 'build:test', 'test:server', 'test:client'].map(name => ({
    name, command: process.execPath, args: [path.resolve(values['npm-cli']), 'run', name],
  }));
  checks.push({name: 'module-matrix', command: process.execPath,
    args: ['node_modules/mocha/bin/mocha.js', '--parallel', '--jobs', '4', '--import=tsx', '--require', 'tests/testing/setup.ts', ...matrixFiles]});
  const env = {...process.env, PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH,
    TEMP: outputDir, TMP: outputDir, TMPDIR: outputDir, ELO_DATA_DIR: path.join(outputDir, 'elo'), TM_DISABLE_TELEGRAM: '1'};
  const outcome = runChecks(checks, {cwd: repoRoot, env, outputDir});
  writeFileSync(path.join(outputDir, 'results.json'), JSON.stringify({sourceSha: head.stdout.trim(), node: process.version,
    recordedAt: new Date().toISOString(), timeoutMs, ...outcome}, null, 2));
  if (!outcome.passed) process.exitCode = outcome.results.at(-1)?.exitCode || 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
