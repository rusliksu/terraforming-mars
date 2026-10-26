import {expect} from 'chai';
import {clearPlayerTunings, setPlayerTuning} from '../../src/server/ai/aiTuning';
import {Player} from '../../src/server/Player';
import {Database} from '../../src/server/database/Database';
import {runInSandbox, isSimulating} from '../../src/server/ai/simulationSandbox';
import {chooseResponse} from '../../src/server/ai/chooseResponse';
import {aiPlayerName} from '../../src/common/ai/AiLevel';
import {playRandomGame} from './playRandomGame';
import {testGame} from '../TestGame';
import {Server} from '../../src/server/models/ServerModel';
import {SelectOption} from '../../src/server/inputs/SelectOption';

// The end-to-end game is random. A fixed seed and a repeatable answer stream keep this test
// reproducible instead of depending on the CI machine's luck.
function seededRandom(): () => number {
  let state = 0x1234567;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('AI player', () => {
  it('keeps its level through serialization', () => {
    const [game, player] = testGame(2);
    player.aiLevel = 'hard';
    const restored = Player.deserialize(JSON.parse(JSON.stringify(player.serialize())));
    expect(restored.aiLevel).eq('hard');
    expect(game.players[1].aiLevel).is.undefined;
  });

  it('hides the input of an AI player from its page, so viewers just watch', () => {
    const [/* game */, human, ai] = testGame(2);
    ai.aiLevel = 'normal';
    human.setWaitingFor(new SelectOption('test'));
    expect(Server.getPlayerModel(human).waitingFor).is.not.undefined;
    // Assigned directly: setWaitingFor would make the AI answer right away
    (ai as any).waitingFor = new SelectOption('test');
    expect(Server.getPlayerModel(ai).waitingFor).is.undefined;
  });

  it('marks AI names with their level', () => {
    expect(aiPlayerName('Claude', 'normal')).eq('Claude [AI]');
    expect(aiPlayerName('Green (AI)', 'easy')).eq('Green [AI-]');
    expect(aiPlayerName('Rot [AI]', 'hard')).eq('Rot [AI+]');
  });

  it('sandbox swaps the database and restores it', () => {
    const database = Database.getInstance();
    runInSandbox(() => {
      expect(isSimulating()).is.true;
      expect(Database.getInstance()).not.eq(database);
    });
    expect(isSimulating()).is.false;
    expect(Database.getInstance()).eq(database);
  });

  it('plays a complete game and beats a random player', () => {
    const result = playRandomGame({
      playerCount: 2,
      gameOptions: {},
      maximumGenerations: 30,
      maximumDecisions: 20000,
      maximumAttemptsPerDecision: 200,
      seed: 0.42,
      random: seededRandom(),
      // Without rollouts: they take seconds per action, the whole game would exceed the timeout.
      responders: [(input, player) => {
        setPlayerTuning(player.id, 'noRollout');
        return chooseResponse(input, player, 'normal');
      }, undefined],
    });
    clearPlayerTunings();
    expect(result.finished).is.true;
    expect(result.victoryPoints[0]).greaterThan(result.victoryPoints[1]);
  }).timeout(600000); // The custom server build is slower than upstream and CI runners vary: ~30-90 s locally.
});
