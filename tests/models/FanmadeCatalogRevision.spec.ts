import {expect} from 'chai';
import {Server} from '@/server/models/ServerModel';
import {testGame} from '@tests/TestGame';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';

describe('FanmadeCatalogRevision', () => {
  it('rejects modified, missing or newly added gameplay source before announcing the catalog', () => {
    const root = process.cwd();
    const helper = path.join(root, 'tools/fanmade-port/check-catalog-source.js');
    const manifestPath = path.join(root, 'tools/fanmade-port/fanmade-catalog-source-manifest.json');
    expect(() => execFileSync(process.execPath, [helper], {stdio: 'pipe'})).not.to.throw();
    const scratch = mkdtempSync(path.join(tmpdir(), 'fanmade-source-watch-'));
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    mkdirSync(path.join(scratch, 'src/common'), {recursive: true});
    mkdirSync(path.join(scratch, 'src/server'), {recursive: true});
    const source = path.join(scratch, 'src/server/Production.ts');
    const text = 'export const source = 1;\n';
    writeFileSync(source, text);
    writeFileSync(path.join(scratch, 'package-lock.json'), '{}');
    manifest.files = {
      'src/server/Production.ts': createHash('sha256').update(text).digest('hex'),
      'package-lock.json': createHash('sha256').update('{}').digest('hex'),
    };
    const fixture = path.join(scratch, 'fixture.json');
    writeFileSync(fixture, JSON.stringify(manifest));
    const check = () => execFileSync(process.execPath, [helper, '--source', scratch, '--manifest', fixture], {stdio: 'pipe'});
    expect(check).not.to.throw();
    writeFileSync(source, readFileSync(source, 'utf8') + '\n// deliberate source mutation\n');
    expect(check).to.throw('Reviewed source changed');
    delete manifest.files['src/server/Production.ts'];
    const incomplete = path.join(scratch, 'manifest.json');
    writeFileSync(incomplete, JSON.stringify(manifest));
    expect(() => execFileSync(process.execPath, [helper, '--source', scratch, '--manifest', incomplete], {stdio: 'pipe'}))
      .to.throw('Reviewed source file set differs');
    writeFileSync(path.join(scratch, 'src/server/unreviewed.ts'), 'export const unexpected = true;\n');
    expect(check).to.throw('Reviewed source file set differs');
  }).timeout(10000);

  it('announces the same factual catalog through every game model entrance', () => {
    const [game, player] = testGame(2, {idesOfMarsExpansion: true});
    const models = [Server.getGameModel(game), Server.getSimpleGameModel(game),
      Server.getPlayerModel(player).game, Server.getSpectatorModel(game).game];
    for (const model of models) {
      const wire = JSON.parse(JSON.stringify(model));
      expect(wire).to.have.property('fanmadeCatalogRevision', 'fanmade:custom-reviewed');
      expect(wire.automationCompatibility.unsupportedFeatures).to.include('idesOfMars');
    }
  });
});
