// Build gate for the reviewed factual catalog; no filesystem work occurs in game requests.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {parseArgs} = require('node:util');
const ROOT = path.resolve(__dirname, '../..');

function sourceFiles(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), {withFileTypes: true})) {
      const relative = directory + '/' + entry.name;
      if (entry.isSymbolicLink()) throw Error('Symlink in reviewed source: ' + relative);
      if (entry.isDirectory()) walk(relative);
      else if (entry.isFile() && /\.(ts|js|json)$/.test(entry.name)) files.push(relative);
    }
  }
  walk('src/common');
  walk('src/server');
  files.push('package-lock.json');
  return files.sort();
}

function fingerprint(root, filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, filename), 'utf8')
    .replace(/\r\n/g, '\n')).digest('hex');
}

const WRITE_HINT = 'Run: node tools/fanmade-port/check-catalog-source.js --write';

function sourceDiff(root, manifest) {
  const actual = sourceFiles(root);
  const recorded = manifest.files || {};
  const actualSet = new Set(actual);
  const recordedSet = new Set(Object.keys(recorded));
  return {
    actual,
    added: actual.filter((filename) => !recordedSet.has(filename)),
    removed: Object.keys(recorded).filter((filename) => !actualSet.has(filename)),
    changed: actual.filter((filename) => recordedSet.has(filename) &&
      fingerprint(root, filename) !== recorded[filename]),
  };
}

// The failure lists every stale file and the exact command that refreshes the digests,
// so a source edit never needs a manual hunt through this tool.
function describeDiff(diff) {
  const lines = [];
  if (diff.changed.length) lines.push('changed: ' + diff.changed.join(', '));
  if (diff.added.length) lines.push('added: ' + diff.added.join(', '));
  if (diff.removed.length) lines.push('removed: ' + diff.removed.join(', '));
  return lines.length ? ' (' + lines.join('; ') + ')' : '';
}

function checkCatalogSource(root, manifest) {
  if (manifest.schemaVersion !== 1 || manifest.catalogId !== 'fanmade:rebalanced-v1' ||
      !/^[a-f0-9]{64}$/.test(manifest.bundleDigest || '') ||
      !Array.isArray(manifest.identities) || new Set(manifest.identities).size !== 488 ||
      manifest.identities.length !== 488) throw Error('Invalid factual source manifest');
  const diff = sourceDiff(root, manifest);
  if (JSON.stringify(diff.actual) !== JSON.stringify(Object.keys(manifest.files).sort())) {
    throw Error('Reviewed source file set differs' + describeDiff(diff) + '. ' + WRITE_HINT);
  }
  if (diff.changed.length) {
    throw Error('Reviewed source changed' + describeDiff(diff) + '. ' + WRITE_HINT);
  }
  return {catalogId: manifest.catalogId, identities: 488, files: diff.actual.length};
}

function writeCatalogSource(root, manifest) {
  const diff = sourceDiff(root, manifest);
  const files = {};
  for (const filename of diff.actual) files[filename] = fingerprint(root, filename);
  return {manifest: {...manifest, files}, changed: diff.changed, added: diff.added, removed: diff.removed};
}

function main() {
  const {values} = parseArgs({options: {source: {type: 'string'}, manifest: {type: 'string'},
    write: {type: 'boolean'}}});
  const manifestPath = values.manifest ||
    path.join(ROOT, 'tools/fanmade-port/fanmade-catalog-source-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const root = path.resolve(values.source || ROOT);
  if (values.write) {
    const written = writeCatalogSource(root, manifest);
    fs.writeFileSync(manifestPath, JSON.stringify(written.manifest, null, 2) + '\n');
    console.log(JSON.stringify({catalogId: written.manifest.catalogId, written: manifestPath,
      files: Object.keys(written.manifest.files).length, changed: written.changed,
      added: written.added, removed: written.removed}));
    return;
  }
  console.log(JSON.stringify(checkCatalogSource(root, manifest)));
}

if (require.main === module) main();
module.exports = {sourceFiles, fingerprint, checkCatalogSource, writeCatalogSource};
