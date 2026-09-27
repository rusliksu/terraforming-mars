import {expect} from 'chai';
import {CostIndex} from '../../../src/server/cards/sillyfication/CostIndex';
import {CardResource} from '../../../src/common/CardResource';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {fakeCard, finishGeneration, runAllActions} from '../../TestingUtils';

describe('CostIndex', () => {
  let card: CostIndex;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new CostIndex();
    [game, player] = testGame(1);
    player.playedCards.push(card);
  });

  it('starts with 36 M€, 4 steel, 4 titanium, and stores data on itself', () => {
    expect(card.startingMegaCredits).to.eq(36);
    expect(card.resourceType).to.eq(CardResource.DATA);
    expect(card.resourceCount).to.eq(0);

    card.play(player);
    expect(player.steel).to.eq(4);
    expect(player.titanium).to.eq(4);
  });

  it('a card costing more than the data here (0) banks the difference and flips to cheap', () => {
    card.onCardPlayed(player, fakeCard({cost: 12}));
    runAllActions(game);

    expect(card.resourceCount).to.eq(12);
  });

  it('a free card (cost 0) does not trigger the expensive side (0 is not > 0)', () => {
    card.onCardPlayed(player, fakeCard({cost: 0}));
    runAllActions(game);
    expect(card.resourceCount).to.eq(0);
  });

  it('a card without a defined cost (e.g. its own corp reveal) never triggers either side', () => {
    card.onCardPlayed(player, card);
    runAllActions(game);
    expect(card.resourceCount).to.eq(0);
  });

  describe('once flipped to its cheap side (10 data banked)', () => {
    beforeEach(() => {
      card.onCardPlayed(player, fakeCard({cost: 10}));
      runAllActions(game);
      expect(card.resourceCount).to.eq(10);
    });

    it('an even-more-expensive card played on the cheap side does nothing (front-side rule is inactive)', () => {
      card.onCardPlayed(player, fakeCard({cost: 20}));
      runAllActions(game);
      expect(card.resourceCount).to.eq(10);
    });

    it('a card costing less than the data here removes that much data and gains a flat 5 M€', () => {
      const megaCreditsBefore = player.megaCredits;
      card.onCardPlayed(player, fakeCard({cost: 4}));
      runAllActions(game);

      expect(card.resourceCount).to.eq(6);
      expect(player.megaCredits).to.eq(megaCreditsBefore + 5);
    });

    it('a card costing exactly the same as the data here does nothing', () => {
      const megaCreditsBefore = player.megaCredits;
      card.onCardPlayed(player, fakeCard({cost: 10}));
      runAllActions(game);

      expect(card.resourceCount).to.eq(10);
      expect(player.megaCredits).to.eq(megaCreditsBefore);
    });

    it('a card costing more than the data here does nothing (still on the cheap side)', () => {
      const megaCreditsBefore = player.megaCredits;
      card.onCardPlayed(player, fakeCard({cost: 15}));
      runAllActions(game);

      expect(card.resourceCount).to.eq(10);
      expect(player.megaCredits).to.eq(megaCreditsBefore);
    });

    it('a free card (cost 0) does not trigger the cheap side either', () => {
      const megaCreditsBefore = player.megaCredits;
      card.onCardPlayed(player, fakeCard({cost: 0}));
      runAllActions(game);

      expect(card.resourceCount).to.eq(10);
      expect(player.megaCredits).to.eq(megaCreditsBefore);
    });

    it('flips back to the expensive side at the end of the generation, keeping its remaining data', () => {
      card.onCardPlayed(player, fakeCard({cost: 4}));
      runAllActions(game);
      expect(card.resourceCount).to.eq(6);

      finishGeneration(game);

      // Now back on the expensive side: a cost-4 card no longer exceeds the 6 data here.
      const megaCreditsBefore = player.megaCredits;
      card.onCardPlayed(player, fakeCard({cost: 4}));
      runAllActions(game);
      expect(card.resourceCount).to.eq(6);
      expect(player.megaCredits).to.eq(megaCreditsBefore);

      // A cost-9 card exceeds it by 3, banking 3 more and flipping again.
      card.onCardPlayed(player, fakeCard({cost: 9}));
      runAllActions(game);
      expect(card.resourceCount).to.eq(9);
    });
  });

  it('round-trips flipped state through serialize/deserialize', () => {
    card.onCardPlayed(player, fakeCard({cost: 5}));
    runAllActions(game);

    const serialized: any = {name: card.name, resourceCount: card.resourceCount};
    card.serialize(serialized);
    expect(serialized.data).to.deep.eq({flipped: true});

    const restored = new CostIndex();
    restored.resourceCount = serialized.resourceCount;
    restored.deserialize(serialized);

    // Still flipped, so a more-expensive card does nothing...
    restored.onCardPlayed(player, fakeCard({cost: 20}));
    runAllActions(game);
    expect(restored.resourceCount).to.eq(5);

    // ...but a cheaper one does.
    restored.onCardPlayed(player, fakeCard({cost: 2}));
    runAllActions(game);
    expect(restored.resourceCount).to.eq(3);
  });
});
