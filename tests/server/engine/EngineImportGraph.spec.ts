import {expect} from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const ENTRY = path.join(REPO_ROOT, 'src/server/engine/worker.ts');

const FORBIDDEN_PREFIXES = [
  'src/client/',
  'src/server/database/',
  'src/server/routes/',
  'src/server/server/',
  'src/server/server.ts',
  'src/server/TelegramBot.ts',
  'src/server/auth/',
];

const FORBIDDEN_PACKAGES = ['fs', 'https', 'http', 'net', 'tls', 'child_process', 'worker_threads'];

function resolveLocalImport(fromFile: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) {
    return undefined;
  }
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

interface ImportGraph {
  files: Set<string>;
  externalPackages: Set<string>;
  unresolvedLocalSpecifiers: Set<string>;
}

function collectStaticImportGraph(entry: string): ImportGraph {
  const files = new Set<string>();
  const externalPackages = new Set<string>();
  const unresolvedLocalSpecifiers = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (files.has(file)) {
      continue;
    }
    files.add(file);
    const source = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const statement of sourceFile.statements) {
      let specifier: string | undefined;
      let typeOnly = false;
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        specifier = statement.moduleSpecifier.text;
        typeOnly = statement.importClause?.isTypeOnly === true;
      } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined &&
          ts.isStringLiteral(statement.moduleSpecifier)) {
        specifier = statement.moduleSpecifier.text;
        typeOnly = statement.isTypeOnly;
      }
      if (specifier === undefined || typeOnly) {
        continue;
      }
      if (!specifier.startsWith('.')) {
        externalPackages.add(specifier);
        continue;
      }
      const resolved = resolveLocalImport(file, specifier);
      if (resolved === undefined) {
        unresolvedLocalSpecifiers.add(`${path.relative(REPO_ROOT, file)} -> ${specifier}`);
        continue;
      }
      if (resolved.endsWith('.json')) {
        continue;
      }
      queue.push(resolved);
    }
  }
  return {files, externalPackages, unresolvedLocalSpecifiers};
}

describe('engine worker import graph', () => {
  it('does not reach persistence, Telegram, routes, server bootstrap, or Node I/O modules', () => {
    const graph = collectStaticImportGraph(ENTRY);
    expect([...graph.unresolvedLocalSpecifiers]).deep.eq([]);
    expect([...graph.externalPackages].sort()).not.to.include.members(FORBIDDEN_PACKAGES);

    const forbidden: Array<string> = [];
    for (const file of graph.files) {
      const relative = path.relative(REPO_ROOT, file).replaceAll(path.sep, '/');
      if (FORBIDDEN_PREFIXES.some((prefix) => relative.startsWith(prefix) || relative === prefix)) {
        forbidden.push(relative);
      }
    }
    expect(forbidden).deep.eq([]);
    expect([...graph.files].some((file) => file.endsWith('EngineFacade.ts'))).eq(true);
    expect([...graph.files].some((file) => file.endsWith('DeterministicReplay.ts'))).eq(true);
    expect([...graph.files].some((file) => file.endsWith('Game.ts'))).eq(true);
  }).timeout(30000);
});
