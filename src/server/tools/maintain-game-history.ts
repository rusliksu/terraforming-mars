import Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {ArchiveError, integer, isHash, LIMITS, requireArchive} from '@/server/archive/ArchiveFormat';
import {offlinePath} from '@/server/archive/ArchiveFilesystem';
import {SQLiteArchiveRetention} from '@/server/archive/SQLiteArchiveRetention';

const usage = 'Usage: maintain-game-history --offline --database <sqlite-file> --game <id> --archives <directory> --workspace <private-root> --max-states <1..4096> [--apply --exclusive --revision <sha256>]\n' +
  'Defaults to a read-only preview of one completed game. Apply requires verified exclusive storage ownership.\n';

async function main(): Promise<void> {
  let db: Database.Database | undefined;
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
      process.stdout.write(usage); return;
    }
    let selection;
    try {
      requireArchive(args.length <= 16 && args.every((arg) => arg.length <= 4096));
      const {values, tokens} = parseArgs({args, strict: true, allowPositionals: false, tokens: true, options: {
        'offline': {type: 'boolean'}, 'database': {type: 'string'}, 'game': {type: 'string'},
        'archives': {type: 'string'}, 'workspace': {type: 'string'}, 'max-states': {type: 'string'},
        'apply': {type: 'boolean'}, 'exclusive': {type: 'boolean'}, 'revision': {type: 'string'},
      }});
      const names = tokens.filter((token) => token.kind === 'option').map((token) => token.name);
      const maxStates = Number(values['max-states']);
      requireArchive(new Set(names).size === names.length && values.offline === true &&
        typeof values.database === 'string' && values.database.length > 0 &&
        typeof values.archives === 'string' && values.archives.length > 0 &&
        typeof values.workspace === 'string' && values.workspace.length > 0 &&
        typeof values.game === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(values.game) &&
        /^[1-9][0-9]*$/.test(values['max-states'] ?? '') && integer(maxStates, LIMITS.records) &&
        (values.apply === true ? values.exclusive === true && isHash(values.revision) :
          values.exclusive === undefined && values.revision === undefined));
      selection = {database: values.database, game: values.game, archives: values.archives,
        workspace: values.workspace, maxStates, apply: values.apply === true, revision: values.revision};
    } catch {
      throw new SyntaxError('INVALID_ARGUMENTS');
    }
    const filename = await offlinePath(selection.database, selection.workspace);
    requireArchive((await fs.stat(filename)).isFile(), 'SOURCE_UNSUPPORTED');
    db = new Database(filename, {readonly: !selection.apply, fileMustExist: true});
    const retention = new SQLiteArchiveRetention(db, filename, {root: selection.archives, workspace: selection.workspace});
    const plan = await retention.preview(selection.game);
    requireArchive(plan.count <= selection.maxStates, 'LIMIT_EXCEEDED');
    const result = selection.apply ? await retention.apply(selection.game, selection.revision ?? '', true) : plan;
    const bytes = selection.apply ? {databaseBytesBefore: plan.databaseBytes,
      databaseBytesAfter: (await fs.stat(filename)).size, rawSourceBytesBefore: plan.rawSourceBytes} : {};
    process.stdout.write(JSON.stringify({...result, ...bytes, maxStates: selection.maxStates, limits: LIMITS}) + '\n');
  } catch (error) {
    const code = error instanceof SyntaxError ? 'INVALID_ARGUMENTS' : error instanceof ArchiveError ? error.code : 'IO_FAILURE';
    process.stderr.write(JSON.stringify({status: 'ERROR', code}) + '\n');
    process.exitCode = code === 'INVALID_ARGUMENTS' ? 2 : 1;
  } finally {
    db?.close();
  }
}

if (require.main === module) {
  void main();
}
