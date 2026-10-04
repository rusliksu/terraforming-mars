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

function checkCatalogSource(root, manifest) {
  if (manifest.schemaVersion !== 1 || manifest.catalogId !== 'fanmade:custom-reviewed' ||
      !/^[a-f0-9]{64}$/.test(manifest.bundleDigest || '') ||
      !Array.isArray(manifest.identities) || new Set(manifest.identities).size !== 297 ||
      manifest.identities.length !== 297) throw Error('Invalid factual source manifest');
  const actual = sourceFiles(root);
  const expected = Object.keys(manifest.files).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error('Reviewed source file set differs');
  for (const filename of actual) {
    if (fingerprint(root, filename) !== manifest.files[filename]) throw Error('Reviewed source changed: ' + filename);
  }
  return {catalogId: manifest.catalogId, identities: 297, files: actual.length};
}

function main() {
  const {values} = parseArgs({options: {source: {type: 'string'}, manifest: {type: 'string'}}});
  const manifest = JSON.parse(fs.readFileSync(values.manifest ||
    path.join(ROOT, 'tools/fanmade-port/fanmade-catalog-source-manifest.json'), 'utf8'));
  console.log(JSON.stringify(checkCatalogSource(path.resolve(values.source || ROOT), manifest)));
}

if (require.main === module) main();
module.exports = {sourceFiles, fingerprint, checkCatalogSource};
