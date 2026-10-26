import fs from 'node:fs/promises';
import path from 'node:path';
import {SQLite} from '@/server/database/SQLite';
import {Phase} from '@/common/Phase';
import {TileType} from '@/common/TileType';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {CrediCor} from '@/server/cards/corporation/CrediCor';
import {Helion} from '@/server/cards/corporation/Helion';
import {Birds} from '@/server/cards/base/Birds';
import {testGame} from '@tests/TestGame';
import {setTestDatabase, restoreTestDatabase} from '@tests/testing/setup';

class FixtureDatabase extends SQLite {
  close() {
    this.db.close();
  }
}

async function createFixture() {
  const root = process.argv[2];
  if (process.argv.length !== 3 || root === undefined || !path.isAbsolute(root)) {
    throw new Error('Usage: tsx scripts/replay/create-fixture.ts D:/tm-db/smartbot-lab/<existing-directory>');
  }
  const resolved = (await fs.realpath(root)).replaceAll('\\', '/');
  if (!/^D:\/tm-db\/smartbot-lab(?:\/|$)/i.test(resolved)) {
    throw new Error('Replay fixtures require an existing directory under D:/tm-db/smartbot-lab');
  }
  const workspace = await fs.mkdtemp(path.join(resolved, 'replay-fixture-'));
  const filename = path.join(workspace, 'db', 'game.db');
  const archiveRoot = path.join(workspace, 'archives');
  await fs.mkdir(path.dirname(filename));
  await fs.mkdir(archiveRoot);
  const db = new FixtureDatabase(filename, true, 4096, {root: archiveRoot, workspace});
  await db.initialize();
  setTestDatabase(db);
  try {
    const games = [];
    for (const count of [4, 100]) {
      const suffix = count === 4 ? '-replay-ui' : '-replay-perf';
      const [game, blue, red] = testGame(2, {}, suffix);
      await game.saveGamePromise;
      blue.name = 'Replay Blue';
      red.name = 'Replay Red';
      blue.playedCards.push(new CrediCor());
      red.playedCards.push(new Helion());
      blue.cardsInHand = [new Birds()];
      blue.production.override({megacredits: 4});
      const space = game.board.spaces.find((space) => space.spaceType === 'land' && space.tile === undefined);
      if (space === undefined) {
        throw new Error('Synthetic board has no land space');
      }
      const ids = count === 4 ? [0, 4, 9, 12] : Array.from({length: count}, (_, index) => index * 2);
      const expected = [];
      for (const [index, saveId] of ids.entries()) {
        const generation = count === 4 ? index + 1 : 1 + Math.floor(index / 10);
        const phase = count === 4 ? [Phase.DRAFTING, Phase.RESEARCH, Phase.PRODUCTION, Phase.END][index] :
          index === count - 1 ? Phase.END : Phase.ACTION;
        const megacredits = 30 + saveId;
        const message = 'Public saved record ' + saveId;
        game.lastSaveId = saveId;
        game.phase = phase;
        game.generation = generation;
        blue.megaCredits = megacredits;
        game.gameLog = [new LogMessage(LogMessageType.DEFAULT, message, []),
          new LogMessage(LogMessageType.DEFAULT, 'PRIVATE-REPLAY-MARKER', [], blue.id)];
        if (index > 0) {
          space.tile = {tileType: TileType.GREENERY};
          space.player = blue;
        }
        await db.saveGame(game);
        expected.push({saveId, generation, phase, megacredits, megacreditProduction: 4,
          greenery: index > 0, message});
      }
      await db.markFinished(game.id);
      games.push({gameId: game.id, spectatorId: game.spectatorId, spaceId: space.id, expected,
        privateMarkers: [blue.id, red.id, 'Birds', 'PRIVATE-REPLAY-MARKER']});
    }
    const fixture = {workspace, filename, archiveRoot, games};
    await fs.writeFile(path.join(workspace, 'fixture.json'), JSON.stringify(fixture, undefined, 2) + '\n');
    console.log(JSON.stringify(fixture));
  } finally {
    restoreTestDatabase();
    db.close();
  }
}

createFixture().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
