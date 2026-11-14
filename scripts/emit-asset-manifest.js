#!/usr/bin/env node
'use strict';

// Turns the webpack/lessc output into content-addressed asset names and writes
// build/asset-manifest.json so the server can point the HTML shell at them.
//
// main.js and vendors.js are already hashed by webpack ([contenthash:16]); styles.css is
// produced by lessc and is renamed here. The compressed .gz/.br copies are rebuilt for the
// hashed name because the server (and nginx) only look for "<file>.gz"/"<file>.br".
//
// Rebuilds are idempotent: only the newest hashed entry file is kept and stale copies from
// a previous build are removed from build/ (webpack never cleans the build root itself).
// Running build:client without make:css reuses the stylesheet produced by the last full
// build instead of failing, matching the previous behaviour of that script.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BUILD_DIR = path.resolve(__dirname, '..', 'build');
const MANIFEST_PATH = path.join(BUILD_DIR, 'asset-manifest.json');
const HASH_LENGTH = 16;
const COMPRESSED_SUFFIXES = ['', '.gz', '.br', '.map', '.map.gz', '.map.br'];

function fail(message) {
  console.error('emit-asset-manifest: ' + message);
  process.exit(1);
}

function removeEntry(fileName) {
  for (const suffix of COMPRESSED_SUFFIXES) {
    fs.rmSync(path.join(BUILD_DIR, fileName + suffix), {force: true});
  }
}

function newest(files) {
  return files
    .map((file) => ({file, mtime: fs.statSync(path.join(BUILD_DIR, file)).mtimeMs}))
    .sort((a, b) => b.mtime - a.mtime);
}

// Webpack never cleans the build root, so a rebuild in the same checkout can leave the
// previous, unhashed main.js/vendors.js behind. Shipping those would serve stale code to a
// tab that still holds pre-release HTML, so they are removed here.
function removeLegacyEntry(baseName) {
  for (const suffix of ['', '.gz', '.br']) {
    fs.rmSync(path.join(BUILD_DIR, baseName + '.js' + suffix), {force: true});
  }
  for (const suffix of ['', '.gz', '.br']) {
    fs.rmSync(path.join(BUILD_DIR, baseName + '.js.map' + suffix), {force: true});
  }
}

function pickHashedEntry(baseName) {
  const pattern = new RegExp('^' + baseName + '\\.[0-9a-f]{' + HASH_LENGTH + '}\\.js$');
  const matches = newest(fs.readdirSync(BUILD_DIR).filter((file) => pattern.test(file)));
  if (matches.length === 0) {
    fail('build/' + baseName + '.<hash>.js is missing; run webpack before this script.');
  }
  for (const stale of matches.slice(1)) {
    removeEntry(stale.file);
  }
  return matches[0].file;
}

function writeCompressed(file) {
  const content = fs.readFileSync(file);
  fs.writeFileSync(file + '.gz',
    zlib.gzipSync(content, {level: zlib.constants.Z_BEST_COMPRESSION}));
  fs.writeFileSync(file + '.br',
    zlib.brotliCompressSync(content, {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      },
    }));
}

function resolveStylesheet() {
  const plain = path.join(BUILD_DIR, 'styles.css');
  if (fs.existsSync(plain)) {
    const content = fs.readFileSync(plain);
    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, HASH_LENGTH);
    return {content, name: 'styles.' + hash + '.css'};
  }
  const pattern = new RegExp('^styles\\.[0-9a-f]{' + HASH_LENGTH + '}\\.css$');
  const existing = newest(fs.readdirSync(BUILD_DIR).filter((file) => pattern.test(file)));
  if (existing.length === 0) {
    fail('build/styles.css is missing; run npm run make:css before this script.');
  }
  return {content: undefined, name: existing[0].file};
}

const styles = resolveStylesheet();
const hashedCssPath = path.join(BUILD_DIR, styles.name);
if (styles.content !== undefined) {
  fs.writeFileSync(hashedCssPath, styles.content);
  writeCompressed(hashedCssPath);
} else if (!fs.existsSync(hashedCssPath + '.br') || !fs.existsSync(hashedCssPath + '.gz')) {
  writeCompressed(hashedCssPath);
}

// The server falls back to the unhashed names when the manifest is absent, but keeping a
// stale plain styles.css (or an older hashed copy) next to the current one is a trap.
const staleCssPattern = new RegExp('^styles\\.[0-9a-f]{' + HASH_LENGTH + '}\\.css(?:\\.gz|\\.br)?$');
for (const file of fs.readdirSync(BUILD_DIR)) {
  if (file === styles.name || file === styles.name + '.gz' || file === styles.name + '.br') {
    continue;
  }
  if (staleCssPattern.test(file) || file === 'styles.css' || file === 'styles.css.gz' || file === 'styles.css.br') {
    fs.rmSync(path.join(BUILD_DIR, file), {force: true});
  }
}

const mainName = pickHashedEntry('main');
const vendorsName = pickHashedEntry('vendors');
removeLegacyEntry('main');
removeLegacyEntry('vendors');

const manifest = {
  'main.js': mainName,
  'vendors.js': vendorsName,
  'styles.css': styles.name,
};
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log('asset-manifest: ' + JSON.stringify(manifest));
