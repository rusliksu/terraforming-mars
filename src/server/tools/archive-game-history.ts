import {parseArgs} from 'node:util';
import {ArchiveError, requireArchive} from '@/server/archive/ArchiveFormat';
import {exportHistory} from '@/server/archive/ArchiveWriter';
import {HistorySource} from '@/server/archive/HistorySource';
import {preflight} from '@/server/archive/ArchivePreflight';

const usage = 'Usage: archive-game-history --offline --source files|sqlite --input <offline-path> --game <id> --output <private-directory> [--workspace <private-root>] [--preview]\n' +
  'Windows requires D: paths. Linux requires an explicit private workspace. Preview writes no archive.\n' +
  'Exports one completed offline history. Raw archives are private; no deletion or public replay.\n';

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
      process.stdout.write(usage); return;
    }
    let selection: ConstructorParameters<typeof HistorySource>[0];
    let output: string;
    let preview: boolean;
    try {
      requireArchive(args.length <= 12 && args.every((arg) => arg.length <= 4096));
      const {values, tokens} = parseArgs({args, strict: true, allowPositionals: false, tokens: true, options: {
        offline: {type: 'boolean'}, source: {type: 'string'}, input: {type: 'string'},
        game: {type: 'string'}, output: {type: 'string'},
        workspace: {type: 'string'}, preview: {type: 'boolean'},
      }});
      const names = tokens.filter((token) => token.kind === 'option').map((token) => token.name);
      requireArchive(names.length >= 5 && new Set(names).size === names.length && values.offline === true &&
        (values.source === 'files' || values.source === 'sqlite') &&
        typeof values.input === 'string' && values.input.length > 0 &&
        typeof values.game === 'string' && values.game.length > 0 &&
        typeof values.output === 'string' && values.output.length > 0 &&
        (values.workspace === undefined || values.workspace.length > 0));
      selection = {kind: values.source, path: values.input, gameId: values.game, offline: true, workspace: values.workspace};
      output = values.output;
      preview = values.preview === true;
    } catch {
      throw new SyntaxError('INVALID_ARGUMENTS');
    }
    const source = new HistorySource(selection);
    const receipt = preview ? (await preflight(source, output)).summary : await exportHistory(source, output);
    process.stdout.write(JSON.stringify(receipt) + '\n');
  } catch (error) {
    const code = error instanceof SyntaxError ? 'INVALID_ARGUMENTS' : error instanceof ArchiveError ? error.code : 'IO_FAILURE';
    process.stderr.write(JSON.stringify({status: 'ERROR', code}) + '\n');
    process.exitCode = code === 'INVALID_ARGUMENTS' ? 2 : 1;
  }
}

if (require.main === module) {
  void main();
}
