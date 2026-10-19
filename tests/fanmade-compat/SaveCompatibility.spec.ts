import {expect} from 'chai';
import {readFileSync} from 'fs';
import {join} from 'path';
import {Game} from '../../src/server/Game';
import {SerializedGame} from '../../src/server/SerializedGame';
import {Server} from '../../src/server/models/ServerModel';
import {FANMADE_MODULES} from '../../src/server/bot/AutomationCompatibility';
import {testGame} from '../TestGame';

describe('Fanmade save compatibility', () => {
  it('restores an actual pre-port action save with target tracking intact', () => {
    const saved: SerializedGame = JSON.parse(readFileSync(join(__dirname, 'fixtures/pre-port-action.json'), 'utf8'));
    const game = Game.deserialize(saved, {simulation: true});
    expect(game.shadowInputSeq).eq(17);
    expect(game.players[0].megaCredits).eq(43);
    expect(game.players[0].preludeHandicap).eq(1);
    expect(game.players[0].lastTurnNoticeKey).eq('synthetic-notice');
    expect([...game.botPlayerIds]).deep.eq(saved.botPlayerIds);
    expect(game.players[0].getWaitingFor()).not.eq(undefined);
    expect(game.projectDeck.serialize()).deep.eq(saved.projectDeck);
    expect(Server.getGameModel(game).automationCompatibility?.unsupportedFeatures).deep.eq([]);
    for (const module of FANMADE_MODULES) {
      expect(game.gameOptions.expansions[module]).eq(false);
    }
    expect(game.gameOptions.undoStepOption).eq(true);
  });

  for (const module of FANMADE_MODULES) {
    it(`round-trips ${module} setup without changing its public board or deals`, () => {
      const [game] = testGame(4, {[`${module}Expansion`]: true, turmoilExtension: true,
        venusNextExtension: true, moonExpansion: true, preludeExtension: true});
      const saved = JSON.parse(JSON.stringify(game.serialize()));
      const restored = Game.deserialize(saved, {viewOnly: true});
      expect(restored.gameOptions.expansions[module]).eq(true);
      expect(restored.projectDeck.serialize()).deep.eq(game.projectDeck.serialize());
      expect(restored.players.map((p) => p.dealtProjectCards.map((c) => c.name)))
        .deep.eq(game.players.map((p) => p.dealtProjectCards.map((c) => c.name)));
      expect(Server.getGameModel(restored).spaces).deep.eq(Server.getGameModel(game).spaces);
      expect(Server.getGameModel(restored).automationCompatibility?.unsupportedFeatures).include(module);
    });
  }
});
