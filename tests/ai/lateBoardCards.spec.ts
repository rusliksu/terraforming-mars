import {expect} from 'chai';
import {testGame} from '../TestGame';
import {clearPlayerTunings, setPlayerTuning} from '../../src/server/ai/aiTuning';
import {estimateCardTimings} from '../../src/server/ai/cardValue';
import {Greenhouses} from '../../src/server/cards/base/Greenhouses';

// Rated human game (2026-10-16): Greenhouses not bought in generation 5 (value −1.5 with 1 city on the board).
// Strong players always take it and play it as late as possible, when many cities are in play.

// The valuation samples random future tableaus (cardValue.ts uses Math.random). Two samples differ
// by a fraction of a percent, which made this comparison flaky on CI; a fixed seed makes both
// samples repeatable.
function withSeededRandom<T>(fn: () => T): T {
  const original = Math.random;
  let state = 0x2f6e2b1;
  Math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

describe('AI values city-counting cards at the end of the game', () => {
  afterEach(() => clearPlayerTunings());

  function earlyGame() {
    const [game, player, opponent] = testGame(2);
    game.generation = 5;
    game.addCity(player, game.board.getAvailableSpacesForCity(player)[0]);
    game.addCity(opponent, game.board.getAvailableSpacesForCity(opponent)[0]);
    return player;
  }

  it('worth more later than now, and more than without the late board', () => {
    const player = earlyGame();
    const timing = withSeededRandom(() => estimateCardTimings(player, [new Greenhouses()]).get(new Greenhouses().name)!);
    expect(timing.later).to.be.greaterThan(timing.now);
    setPlayerTuning(player.id, 'noLateBoardCards');
    const plain = withSeededRandom(() => estimateCardTimings(earlyGame(), [new Greenhouses()]).get(new Greenhouses().name)!);
    expect(timing.later).to.be.greaterThan(plain.later);
  });
});
