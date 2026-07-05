import {expect} from 'chai';
import {execFileSync} from 'child_process';

function runColorDistanceTool(args: Array<string>): string {
  return execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/tools/check_player_color_distances.ts', ...args], {
    encoding: 'utf8',
  });
}

describe('Player color distance checker', () => {
  it('can limit reports to selectable player colors', () => {
    const output = runColorDistanceTool(['--target', 'vladlen', '--selectable-only', '--threshold', '10']);

    expect(output).to.contain('Color set: selectable');
    expect(output).to.contain('vladlenburgundy #82008C');
    expect(output).not.to.contain('vladlenwine');
    expect(output).not.to.contain('vladlenraspberry');
  });
});
