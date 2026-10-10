import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import {filterReplacedCards} from '@/common/cards/CardReplacementRules';
import {GameCards} from '@/server/GameCards';
import {DEFAULT_GAME_OPTIONS} from '@/server/game/GameOptions';

describe('Rebalanced replacements', () => {
  it('follows an enabled chain to a present endpoint without its intermediate card', () => {
    const cards = [CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS].map((name) => ({name}));
    const filtered = filterReplacedCards(cards, [{
      module: 'rebalanced', cardsToRemove: [], conditionalCardsToRemove: [
        [CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_REBALANCED],
        [CardName.EARLY_SETTLEMENT_REBALANCED, CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS],
      ],
    }]);
    expect(filtered.map((card) => card.name)).deep.eq([CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS]);
  });

  it('retains originals when a replacement chain has no available endpoint', () => {
    const cards = [{name: CardName.EARLY_SETTLEMENT}];
    expect(filterReplacedCards(cards, [{
      module: 'rebalanced', cardsToRemove: [], conditionalCardsToRemove: [
        [CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_REBALANCED],
        [CardName.EARLY_SETTLEMENT_REBALANCED, CardName.EARLY_SETTLEMENT],
      ],
    }])).deep.eq(cards);
  });

  it('registers replacements across projects, corporations, preludes and standard projects', () => {
    const cards = new GameCards({...DEFAULT_GAME_OPTIONS, rebalancedExpansion: true, coloniesExtension: true, preludeExtension: true});
    for (const [pool, original, replacement] of [
      [cards.getProjectCards(), CardName.ADAPTED_LICHEN, CardName.ADAPTED_LICHEN_REBALANCED],
      [cards.getCorporationCards(), CardName.THORGATE, CardName.THORGATE_REBALANCED],
      [cards.getPreludeCards(), CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_REBALANCED],
      [cards.getStandardProjects(), CardName.BUILD_COLONY_STANDARD_PROJECT, CardName.BUILD_COLONY_STANDARD_PROJECT_REBALANCED],
    ] as const) {
      const names = pool.map((card) => card.name);
      expect(names).includes(replacement).and.not.includes(original);
    }
  });

  it('filters included originals again after force-adds only when Rebalanced is enabled', () => {
    const options = {...DEFAULT_GAME_OPTIONS, includedCards: [CardName.MARTIAN_RAILS, CardName.VENUSIAN_INSECTS]};
    expect(new GameCards(options).getProjectCards().map((card) => card.name)).includes(CardName.VENUSIAN_INSECTS);
    const names = new GameCards({...options, rebalancedExpansion: true}).getProjectCards().map((card) => card.name);
    expect(names).includes(CardName.MARTIAN_RAILS_REBALANCED).and.not.includes(CardName.MARTIAN_RAILS);
  });

  it('keeps the original when the published replacement dependency is disabled', () => {
    const names = new GameCards({...DEFAULT_GAME_OPTIONS, coloniesExtension: true, rebalancedExpansion: true}).getProjectCards().map((card) => card.name);
    expect(names).includes(CardName.FLOATER_LEASING).and.not.includes(CardName.FLOATER_LEASING_REBALANCED);
  });

  it('does not infer old pack dependencies for standalone Pristar', () => {
    const names = new GameCards({...DEFAULT_GAME_OPTIONS, rebalancedExpansion: true}).getCorporationCards().map((card) => card.name);
    expect(names).includes(CardName.PRISTAR_REBALANCED);
  });

  it('replaces both published Deimos originals even when the Promo module is disabled', () => {
    const names = new GameCards({...DEFAULT_GAME_OPTIONS, rebalancedExpansion: true, promoCardsOption: false}).getProjectCards().map((card) => card.name);
    expect(names).includes(CardName.DEIMOS_DOWN_PROMO_REBALANCED).and.not.includes(CardName.DEIMOS_DOWN).and.not.includes(CardName.DEIMOS_DOWN_PROMO);
  });
});
