import {expect} from 'chai';
import {SlowStart} from '../../../src/server/cards/sillyfication/SlowStart';
import {Phase} from '../../../src/common/Phase';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('SlowStart', () => {
  let card: SlowStart;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new SlowStart();
    [/* game */, player, player2] = testGame(2, {preludeExtension: true});
  });

  it('increases M€ production 2 steps', () => {
    player.production.override({megacredits: 0});
    card.play(player);
    expect(player.production.megacredits).to.eq(2);
  });

  it('sets the game flag to skip generation 1 actions', () => {
    expect(player.game.skipGeneration1Actions).is.false;
    card.play(player);
    expect(player.game.skipGeneration1Actions).is.true;
  });

  it('routes straight through production once every player finishes research, and clears the flag', () => {
    const game = player.game;
    const generationBefore = game.generation;
    card.play(player);
    game.phase = Phase.RESEARCH;

    game.playerIsFinishedWithResearchPhase(player);
    expect(game.phase).to.eq(Phase.RESEARCH); // still waiting on the other player
    game.playerIsFinishedWithResearchPhase(player2);

    // No player ever got an action-phase turn: production ran immediately and the
    // game moved straight on to the next generation.
    expect(game.generation).to.eq(generationBefore + 1);
    expect(game.skipGeneration1Actions).is.false;
  });
});
