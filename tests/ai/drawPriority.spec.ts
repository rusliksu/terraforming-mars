import {expect} from 'chai';
import {testGame} from '../TestGame';
import {clearPlayerTunings, setPlayerTuning} from '../../src/server/ai/aiTuning';
import {estimateCardValues} from '../../src/server/ai/cardValue';
import {seededRandom} from '../../src/server/ai/randomChoice';
import {AICentral} from '../../src/server/cards/base/AICentral';
import {Research} from '../../src/server/cards/base/Research';
import {DevelopmentCenter} from '../../src/server/cards/base/DevelopmentCenter';
import {ICard} from '../../src/server/cards/ICard';

// Jens' rule (2026-10-17): card-drawing cards are a priority, those drawing by action every generation most.
// Humans played 7.6 of them per game, the AI 1.7.
describe('AI draw priority', () => {
  afterEach(() => clearPlayerTunings());

  const SEED = 0x2f6e2b1;

  // The valuation samples random future tableaus. Both calls below reuse the same seed, so they
  // see the same deck and the same sample; the test measures the draw rule, not the sample.
  function withSeededRandom<T>(fn: () => T): T {
    const original = Math.random;
    Math.random = seededRandom(SEED);
    try {
      return fn();
    } finally {
      Math.random = original;
    }
  }

  function value(card: ICard, tuning: string): number {
    const [game, player] = withSeededRandom(() => testGame(2, undefined, '-drawPriority'));
    game.generation = 3;
    // Development Center spends energy on its action.
    player.production.override({energy: 2});
    setPlayerTuning(player.id, tuning);
    return withSeededRandom(() => estimateCardValues(player, [card]).get(card.name)!);
  }

  for (const card of [new AICentral(), new DevelopmentCenter(), new Research()]) {
    it(`values ${card.name} higher with the rule`, () => {
      // Margin below the full bonus: the later value samples random future tableaus.
      // Since round 123 own drawn cards count 2–4 M€ in hand; the draw rule is compared on its own here.
      const withRule = value(card, 'noOwnCardValueEngine');
      const withoutRule = value(card, 'noDrawRules');
      expect(withRule).to.be.greaterThan(withoutRule + 1);
    });
  }
});
