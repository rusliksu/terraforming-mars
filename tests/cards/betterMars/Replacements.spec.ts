import {expect} from 'chai';
import {GameCards} from '../../../src/server/GameCards';
import {CardName} from '../../../src/common/cards/CardName';
import {DEFAULT_GAME_OPTIONS, GameOptions} from '../../../src/server/game/GameOptions';
import {toName} from '../../../src/common/utils/utils';
import {Tag} from '../../../src/common/cards/Tag';
import {newCard} from '../../../src/server/createCard';
import {LunarBeamBetterMars} from '../../../src/server/cards/betterMars/LunarBeamBetterMars';
import {LunaMetropolisBetterMars} from '../../../src/server/cards/betterMars/LunaMetropolisBetterMars';
import {LunarExportsBetterMars} from '../../../src/server/cards/betterMars/LunarExportsBetterMars';
import {MarsUniversityBetterMars} from '../../../src/server/cards/betterMars/MarsUniversityBetterMars';
import {MeatIndustryBetterMars} from '../../../src/server/cards/betterMars/MeatIndustryBetterMars';
import {LunarMiningBetterMars} from '../../../src/server/cards/betterMars/LunarMiningBetterMars';
import {LunaGovernorBetterMars} from '../../../src/server/cards/betterMars/LunaGovernorBetterMars';
import {Fish} from '../../../src/server/cards/base/Fish';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

const MOON_SWAPS: ReadonlyArray<[CardName, ReadonlyArray<Tag>]> = [
  [CardName.LUNAR_BEAM_BETTER_MARS, [Tag.MOON, Tag.POWER]],
  [CardName.LUNA_METROPOLIS_BETTER_MARS, [Tag.CITY, Tag.SPACE, Tag.MOON]],
  [CardName.LUNAR_EXPORTS_BETTER_MARS, [Tag.SPACE, Tag.MOON]],
  [CardName.LUNAR_MINING_BETTER_MARS, [Tag.MOON]],
  [CardName.LUNA_GOVERNOR_BETTER_MARS, [Tag.MOON, Tag.MOON]],
];

const MARS_ADDS: ReadonlyArray<CardName> = [
  CardName.PRISTAR_BETTER_MARS,
  CardName.EARLY_SETTLEMENT_BETTER_MARS,
  CardName.SELF_SUFFICIENT_SETTLEMENT_BETTER_MARS,
  CardName.EOS_CHASMA_NATIONAL_PARK_BETTER_MARS,
  CardName.IMMIGRATION_SHUTTLES_BETTER_MARS,
  CardName.MARTIAN_RAILS_BETTER_MARS,
  CardName.NOCTIS_CITY_BETTER_MARS,
  CardName.NOCTIS_FARMING_BETTER_MARS,
  CardName.PROTECTED_VALLEY_BETTER_MARS,
  CardName.MARS_UNIVERSITY_BETTER_MARS,
  CardName.PROTECTED_HABITATS_BETTER_MARS,
  CardName.TROPICAL_RESORT_BETTER_MARS,
  CardName.MARTIAN_MEDIA_CENTER_BETTER_MARS,
];

const ALL_REPLACEMENTS: ReadonlyArray<[CardName, CardName]> = [
  [CardName.LUNAR_BEAM_BETTER_MARS, CardName.LUNAR_BEAM],
  [CardName.LUNA_METROPOLIS_BETTER_MARS, CardName.LUNA_METROPOLIS],
  [CardName.LUNAR_EXPORTS_BETTER_MARS, CardName.LUNAR_EXPORTS],
  [CardName.PRISTAR_BETTER_MARS, CardName.PRISTAR],
  [CardName.EARLY_SETTLEMENT_BETTER_MARS, CardName.EARLY_SETTLEMENT],
  [CardName.SELF_SUFFICIENT_SETTLEMENT_BETTER_MARS, CardName.SELF_SUFFICIENT_SETTLEMENT],
  [CardName.EOS_CHASMA_NATIONAL_PARK_BETTER_MARS, CardName.EOS_CHASMA_NATIONAL_PARK],
  [CardName.IMMIGRATION_SHUTTLES_BETTER_MARS, CardName.IMMIGRATION_SHUTTLES],
  [CardName.MARTIAN_RAILS_BETTER_MARS, CardName.MARTIAN_RAILS],
  [CardName.NOCTIS_CITY_BETTER_MARS, CardName.NOCTIS_CITY],
  [CardName.NOCTIS_FARMING_BETTER_MARS, CardName.NOCTIS_FARMING],
  [CardName.PROTECTED_VALLEY_BETTER_MARS, CardName.PROTECTED_VALLEY],
  [CardName.MARS_UNIVERSITY_BETTER_MARS, CardName.MARS_UNIVERSITY],
  [CardName.PROTECTED_HABITATS_BETTER_MARS, CardName.PROTECTED_HABITATS],
  [CardName.TROPICAL_RESORT_BETTER_MARS, CardName.TROPICAL_RESORT],
  [CardName.MARTIAN_MEDIA_CENTER_BETTER_MARS, CardName.MARTIAN_MEDIA_CENTER],
  [CardName.MEAT_INDUSTRY_BETTER_MARS, CardName.MEAT_INDUSTRY],
  [CardName.LUNAR_MINING_BETTER_MARS, CardName.LUNAR_MINING],
  [CardName.LUNA_GOVERNOR_BETTER_MARS, CardName.LUNA_GOVERNOR],
];

describe('BetterMars replacement cards', () => {
  it('moon-swap cards carry a Moon tag', () => {
    for (const [name, tags] of MOON_SWAPS) {
      expect(newCard(name).tags, name).to.deep.eq(tags);
    }
    expect(newCard(CardName.LUNAR_BEAM_BETTER_MARS).tags).to.not.contain(Tag.EARTH);
    expect(newCard(CardName.LUNA_METROPOLIS_BETTER_MARS).tags).to.not.contain(Tag.EARTH);
    expect(newCard(CardName.LUNAR_EXPORTS_BETTER_MARS).tags).to.not.contain(Tag.EARTH);
    expect(newCard(CardName.LUNAR_MINING_BETTER_MARS).tags).to.not.contain(Tag.EARTH);
    expect(newCard(CardName.LUNA_GOVERNOR_BETTER_MARS).tags).to.not.contain(Tag.EARTH);
  });

  it('mars-add cards gain a Mars tag on top of the original tags', () => {
    for (const name of MARS_ADDS) {
      expect(newCard(name).tags, name).to.contain(Tag.MARS);
    }
  });

  it('adjusted costs: Lunar Exports 20, Mars University 10, Meat Industry 2', () => {
    expect(new LunarExportsBetterMars().cost).to.eq(20);
    expect(new MarsUniversityBetterMars().cost).to.eq(10);
    expect(new MeatIndustryBetterMars().cost).to.eq(2);
  });

  it('each replacement has a unique BetterMars card number', () => {
    const numbers = ALL_REPLACEMENTS.map(([name]) => newCard(name).metadata.cardNumber);
    expect(new Set(numbers).size).to.eq(numbers.length);
    numbers.forEach((n) => expect(n).to.match(/^X\d+$/));
  });

  it('Luna Metropolis:bm counts Moon tags for its M€ production', () => {
    expect(JSON.stringify(new LunaMetropolisBetterMars().behavior)).to.contain(Tag.MOON);
    expect(JSON.stringify(new LunaMetropolisBetterMars().behavior)).to.not.contain(Tag.EARTH);
  });

  it('with BetterMars on, base cards are swapped out for the replacements', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      preludeExtension: true,
      venusNextExtension: true,
      coloniesExtension: true,
      turmoilExtension: true,
      promoCardsOption: true,
      betterMarsExpansion: true,
      moonExpansion: true,
      pathfindersExpansion: true,
    };
    const cards = new GameCards(gameOptions);
    const pool = [
      ...cards.getProjectCards().map(toName),
      ...cards.getPreludeCards().map(toName),
      ...cards.getCorporationCards().map(toName),
    ];
    for (const [replacement, base] of ALL_REPLACEMENTS) {
      expect(pool, `${base} removed`).to.not.contain(base);
      expect(pool, `${replacement} present`).to.contain(replacement);
    }
  });

  it('without Pathfinders, Mars-tag replacements fall back to their base cards', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      preludeExtension: true,
      turmoilExtension: true,
      betterMarsExpansion: true,
      pathfindersExpansion: false,
    };
    const cards = new GameCards(gameOptions);
    const pool = [
      ...cards.getProjectCards().map(toName),
      ...cards.getPreludeCards().map(toName),
      ...cards.getCorporationCards().map(toName),
    ];
    for (const name of MARS_ADDS) {
      expect(pool, `${name} absent`).to.not.contain(name);
    }
    // The base cards stay in the pool instead of vanishing along with their replacements.
    expect(pool).to.contain(CardName.EOS_CHASMA_NATIONAL_PARK);
    expect(pool).to.contain(CardName.MARS_UNIVERSITY);
    expect(pool).to.contain(CardName.PRISTAR); // still gated on Turmoil, which is on here
    expect(pool).to.contain(CardName.EARLY_SETTLEMENT);
    // Meat Industry only adds an Animal tag - it doesn't need Pathfinders, so it's still
    // swapped in.
    expect(pool).to.contain(CardName.MEAT_INDUSTRY_BETTER_MARS);
    expect(pool).to.not.contain(CardName.MEAT_INDUSTRY);
  });

  it('removes replaced preludes from an explicit custom list', () => {
    const cards = new GameCards({
      ...DEFAULT_GAME_OPTIONS,
      preludeExtension: true,
      pathfindersExpansion: true,
      betterMarsExpansion: true,
      customPreludes: [CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_BETTER_MARS],
    });
    expect(cards.getPreludeCards().map(toName)).to.deep.eq([CardName.EARLY_SETTLEMENT_BETTER_MARS]);
  });

  it('Luna Metropolis:bm also requires the Moon expansion, since it counts Moon tags', () => {
    // Its bonus scales with Moon tags, so it needs the Moon expansion to be anything
    // but a fixed, non-scaling +1 M€ from its own tag - Venus alone isn't enough.
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      preludeExtension: true,
      venusNextExtension: true,
      betterMarsExpansion: true,
      moonExpansion: false,
    };
    const cards = new GameCards(gameOptions);
    const pool = cards.getProjectCards().map(toName);
    expect(pool).to.not.contain(CardName.LUNA_METROPOLIS_BETTER_MARS);
    // The base (Earth-tag) card comes back instead of leaving neither version -
    // conditionalCardsToRemove only swaps it out once the replacement actually clears
    // its own compatibility check too.
    expect(pool).to.contain(CardName.LUNA_METROPOLIS);
  });

  it('Lunar Beam:bm also requires the Moon expansion, since it swaps Earth for Moon', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      betterMarsExpansion: true,
      moonExpansion: false,
    };
    const cards = new GameCards(gameOptions);
    const pool = cards.getProjectCards().map(toName);
    expect(pool).to.not.contain(CardName.LUNAR_BEAM_BETTER_MARS);
    expect(pool).to.contain(CardName.LUNAR_BEAM);
  });

  it('Lunar Beam:bm replaces the base card once the Moon expansion is also on', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      betterMarsExpansion: true,
      moonExpansion: true,
    };
    const cards = new GameCards(gameOptions);
    const pool = cards.getProjectCards().map(toName);
    expect(pool).to.contain(CardName.LUNAR_BEAM_BETTER_MARS);
    expect(pool).to.not.contain(CardName.LUNAR_BEAM);
  });

  it('Lunar Exports:bm also requires the Moon expansion, since it swaps Earth for Moon', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      coloniesExtension: true,
      betterMarsExpansion: true,
      moonExpansion: false,
    };
    const cards = new GameCards(gameOptions);
    const pool = cards.getProjectCards().map(toName);
    expect(pool).to.not.contain(CardName.LUNAR_EXPORTS_BETTER_MARS);
    expect(pool).to.contain(CardName.LUNAR_EXPORTS);
  });

  it('Lunar Exports:bm replaces the base card once the Moon expansion is also on', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      coloniesExtension: true,
      betterMarsExpansion: true,
      moonExpansion: true,
    };
    const cards = new GameCards(gameOptions);
    const pool = cards.getProjectCards().map(toName);
    expect(pool).to.contain(CardName.LUNAR_EXPORTS_BETTER_MARS);
    expect(pool).to.not.contain(CardName.LUNAR_EXPORTS);
  });

  it('Lunar Mining:bm also requires the Moon expansion, since it swaps Earth for Moon', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      coloniesExtension: true,
      betterMarsExpansion: true,
      moonExpansion: false,
    };
    const cards = new GameCards(gameOptions);
    const pool = cards.getProjectCards().map(toName);
    expect(pool).to.not.contain(CardName.LUNAR_MINING_BETTER_MARS);
    expect(pool).to.contain(CardName.LUNAR_MINING);
  });

  it('Lunar Mining:bm replaces the base card once the Moon expansion is also on', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      coloniesExtension: true,
      betterMarsExpansion: true,
      moonExpansion: true,
    };
    const cards = new GameCards(gameOptions);
    const pool = cards.getProjectCards().map(toName);
    expect(pool).to.contain(CardName.LUNAR_MINING_BETTER_MARS);
    expect(pool).to.not.contain(CardName.LUNAR_MINING);
  });

  it('Luna Governor:bm also requires the Moon expansion, since it swaps Earth for Moon', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      coloniesExtension: true,
      betterMarsExpansion: true,
      moonExpansion: false,
    };
    const cards = new GameCards(gameOptions);
    const pool = cards.getProjectCards().map(toName);
    expect(pool).to.not.contain(CardName.LUNA_GOVERNOR_BETTER_MARS);
    expect(pool).to.contain(CardName.LUNA_GOVERNOR);
  });

  it('Luna Governor:bm replaces the base card once the Moon expansion is also on', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      coloniesExtension: true,
      betterMarsExpansion: true,
      moonExpansion: true,
    };
    const cards = new GameCards(gameOptions);
    const pool = cards.getProjectCards().map(toName);
    expect(pool).to.contain(CardName.LUNA_GOVERNOR_BETTER_MARS);
    expect(pool).to.not.contain(CardName.LUNA_GOVERNOR);
  });

  it('Pristar:bm also requires Turmoil, since it only replaces the Turmoil-only base', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      betterMarsExpansion: true,
      turmoilExtension: false,
    };
    const cards = new GameCards(gameOptions);
    const pool = cards.getCorporationCards().map(toName);
    expect(pool).to.not.contain(CardName.PRISTAR_BETTER_MARS);
    expect(pool).to.not.contain(CardName.PRISTAR); // Pristar itself also requires Turmoil
  });

  it('Planet PR lives in BetterMars now, and still requires Pathfinders', () => {
    const withoutPathfinders: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      betterMarsExpansion: true,
      pathfindersExpansion: false,
    };
    expect(new GameCards(withoutPathfinders).getCorporationCards().map(toName)).to.not.contain(CardName.PLANET_PR);

    const withoutBetterMars: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      betterMarsExpansion: false,
      pathfindersExpansion: true,
    };
    // No longer registered in the Pathfinders module at all.
    expect(new GameCards(withoutBetterMars).getCorporationCards().map(toName)).to.not.contain(CardName.PLANET_PR);

    const withBoth: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      betterMarsExpansion: true,
      pathfindersExpansion: true,
    };
    expect(new GameCards(withBoth).getCorporationCards().map(toName)).to.contain(CardName.PLANET_PR);
  });

  it('with BetterMars off, the base cards are untouched', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      preludeExtension: true,
      venusNextExtension: true,
      coloniesExtension: true,
      turmoilExtension: true,
      promoCardsOption: true,
      betterMarsExpansion: false,
    };
    const cards = new GameCards(gameOptions);
    const pool = [
      ...cards.getProjectCards().map(toName),
      ...cards.getPreludeCards().map(toName),
      ...cards.getCorporationCards().map(toName),
    ];
    for (const [replacement, base] of ALL_REPLACEMENTS) {
      expect(pool, `${base} present`).to.contain(base);
      expect(pool, `${replacement} absent`).to.not.contain(replacement);
    }
  });

  it('Meat Industry:bm has an Animal tag and gains 1 M€ per animal (was 2)', () => {
    const card = new MeatIndustryBetterMars();
    expect(card.tags).to.deep.eq([Tag.BUILDING, Tag.ANIMAL]);

    const [game, player] = testGame(2);
    player.playedCards.push(card);

    const fish = new Fish();
    player.playedCards.push(fish);
    fish.action(player);
    runAllActions(game);

    expect(fish.resourceCount).to.eq(1);
    expect(player.megaCredits).to.eq(1);
  });

  it('Lunar Beam:bm still works like Lunar Beam', () => {
    const [/* game */, player] = testGame(2);
    const card = new LunarBeamBetterMars();
    player.production.override({megacredits: 3});
    card.play(player);
    expect(player.production.heat).to.eq(2);
    expect(player.production.energy).to.eq(2);
    expect(player.production.megacredits).to.eq(1);
  });

  it('Lunar Mining:bm gains titanium production per 2 Moon tags, not Earth tags', () => {
    const [/* game */, player] = testGame(2);
    const card = new LunarMiningBetterMars();
    player.playedCards.push(card);
    player.playedCards.push(fakeCard({tags: [Tag.MOON]}));
    player.playedCards.push(fakeCard({tags: [Tag.EARTH, Tag.EARTH, Tag.EARTH]}));
    card.play(player);
    // 1 Moon tag from itself + 1 from the fake card = 2 Moon tags -> 1 step. The 3
    // Earth tags on the other fake card must not count at all.
    expect(player.production.titanium).to.eq(1);
  });

  it('Luna Governor:bm requires 3 Moon tags, not Earth tags', () => {
    const [/* game */, player] = testGame(2);
    const card = new LunaGovernorBetterMars();
    player.playedCards.push(fakeCard({tags: [Tag.EARTH, Tag.EARTH, Tag.EARTH]}));
    expect(card.canPlay(player)).is.false;

    player.playedCards.push(fakeCard({tags: [Tag.MOON]}));
    expect(card.canPlay(player)).is.false;

    player.playedCards.push(fakeCard({tags: [Tag.MOON, Tag.MOON]}));
    expect(card.canPlay(player)).is.true;
  });
});
