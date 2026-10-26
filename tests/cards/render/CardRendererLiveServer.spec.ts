import {expect} from 'chai';
import {spawnSync} from 'node:child_process';

describe('CardRenderer live server mode', () => {
  it('skips builder callbacks and reuses the empty root', () => {
    const script = `
      import assert from 'node:assert/strict';
      const cardRendererModule = await import('./src/server/cards/render/CardRenderer.ts');
      const serverModule = await import('./src/server/utils/server.ts');
      const {CardRenderer} = cardRendererModule.default ?? cardRendererModule;
      const {isLiveServer, markAsLiveServer} = serverModule.default ?? serverModule;

      markAsLiveServer();
      assert.equal(isLiveServer(), true);

      let callbackCount = 0;
      const first = CardRenderer.builder(() => callbackCount++);
      const second = CardRenderer.builder(() => callbackCount++);

      assert.equal(callbackCount, 0);
      assert.equal(first, second);
      assert.deepEqual(first.rows, [[]]);
    `;

    const child = spawnSync(process.execPath, [
      '--import=tsx',
      '--input-type=module',
      '--eval',
      script,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(child.error).to.be.undefined;
    expect(child.status, child.stderr || child.stdout).to.equal(0);
  });
});
