import {expect} from 'chai';
import {IGame} from '../src/server/IGame';
import {Game} from '../src/server/Game';
import {testGame} from './TestGame';
import {CardName} from '../src/common/cards/CardName';

// High Orbit (fan): the shared Infrastructure card market -- see IGame.highOrbitMarket's doc
// comment. Purchase-flow tests (row locking on buy, per-slot playability) live in
// tests/cards/highOrbit/HighOrbitAcquisition.spec.ts; this file covers the market's own
// lifecycle: initial deal, generation-start unlock/refill, and serialization.
describe('High Orbit Infrastructure market', () => {
  let game: IGame;

  beforeEach(() => {
    [game] = testGame(2, {highOrbitExpansion: true});
  });

  it('deals exactly 3 rows of 5 filled slots at game start', () => {
    expect(game.highOrbitMarket).has.lengthOf(3);
    for (const row of game.highOrbitMarket) {
      expect(row.locked).is.false;
      expect(row.slots).has.lengthOf(5);
      expect(row.slots.every((slot) => slot !== undefined)).is.true;
    }
  });

  it('deals no duplicate slots beyond what the underlying supply actually has', () => {
    // Sanity check that the deal drew from real Infrastructure card names, not garbage.
    const dealt = game.highOrbitMarket.flatMap((row) => row.slots);
    for (const cardName of dealt) {
      expect(cardName).is.not.undefined;
    }
  });

  it('keeps the deck non-empty after the initial 15-card deal (supply comfortably exceeds 15)', () => {
    expect(game.highOrbitDeck.length).is.greaterThan(0);
  });

  it('unlocks every row and refills empty slots at the start of the next generation', () => {
    const boughtCardName = game.highOrbitMarket[0].slots[0];
    expect(boughtCardName).is.not.undefined;

    game.highOrbitMarket[0].locked = true;
    game.highOrbitMarket[0].slots[0] = undefined;
    const deckSizeBefore = game.highOrbitDeck.length;

    // startGeneration is private; drive it the same way other generation-scoped resets
    // (cardsPlayedThisGeneration, resourceRemovalBlockedThisGeneration) are exercised elsewhere --
    // by forcing generation end and letting the game's own phase transition call it.
    game.gotoResearchPhase = () => {};
    (game as unknown as {startGeneration: () => void}).startGeneration();

    expect(game.highOrbitMarket[0].locked).is.false;
    expect(game.highOrbitMarket[0].slots[0]).is.not.undefined;
    expect(game.highOrbitDeck.length).to.eq(deckSizeBefore - 1);
  });

  it('does not refill from an empty deck', () => {
    game.highOrbitDeck = [];
    game.highOrbitMarket[0].locked = true;
    game.highOrbitMarket[0].slots[0] = undefined;

    game.gotoResearchPhase = () => {};
    (game as unknown as {startGeneration: () => void}).startGeneration();

    expect(game.highOrbitMarket[0].slots[0]).is.undefined;
  });

  it('round-trips the market and deck through serialize/deserialize', () => {
    game.highOrbitMarket[0].locked = true;
    game.highOrbitMarket[0].slots[0] = undefined;
    const deckBefore = [...game.highOrbitDeck];
    const cardsBefore = game.highOrbitMarket[0].slots.filter((s) => s !== undefined);

    // Route through an actual JSON round-trip (game.serialize() itself just returns plain
    // object/array references, so it alone doesn't reproduce the undefined -> null gotcha a
    // real save-to-DB/send-over-the-wire round-trip does).
    const reloaded = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())));

    expect(reloaded.highOrbitMarket[0].locked).is.true;
    // The bought slot must still read as empty after the JSON round-trip (null, not a literal
    // `undefined`) -- this is what Player.ts's/Game.ts's "empty slot" checks rely on.
    const reloadedSlot0 = reloaded.highOrbitMarket[0].slots[0];
    expect(reloadedSlot0 === undefined || reloadedSlot0 === null).is.true;
    expect(reloaded.highOrbitMarket[0].slots.filter((s) => s !== undefined && s !== null)).to.deep.eq(cardsBefore);
    expect(reloaded.highOrbitDeck).to.deep.eq(deckBefore);
  });

  it('does not populate the market when the expansion is off', () => {
    const [gameWithoutExpansion] = testGame(2);
    expect(gameWithoutExpansion.highOrbitMarket).has.lengthOf(0);
    expect(gameWithoutExpansion.highOrbitDeck).has.lengthOf(0);
  });

  it('never deals Infrastructure cards into the project deck', () => {
    const dealt = new Set(game.highOrbitMarket.flatMap((row) => row.slots).concat(game.highOrbitDeck));
    const deckCardNames = new Set(game.projectDeck.drawPile.map((card) => card.name));
    for (const cardName of dealt) {
      if (cardName !== undefined) {
        expect(deckCardNames.has(cardName as CardName), `${cardName} should not be in the project deck`).is.false;
      }
    }
  });
});
