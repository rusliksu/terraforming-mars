import {expect} from 'chai';
import {CutoutNetworks} from '../../../src/server/cards/sillyfication/CutoutNetworks';
import {CardName} from '../../../src/common/cards/CardName';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('CutoutNetworks', () => {
  let card: CutoutNetworks;
  let game: IGame;
  let player: TestPlayer;
  let opponent: TestPlayer;

  beforeEach(() => {
    card = new CutoutNetworks();
    [game, player, opponent] = testGame(2);
    player.playedCards.push(card);
  });

  function deadDropCard() {
    return fakeCard({name: CardName.DEAD_DROP});
  }

  it('starts with 42 M€ and no tags', () => {
    expect(card.startingMegaCredits).to.eq(42);
    expect(card.tags).to.deep.eq([]);
  });

  it('first action shuffles 1 Dead Drop into the deck for every 20 cards already there, then everyone draws 3', () => {
    const sizeBefore = game.projectDeck.size();
    const expectedCount = Math.floor(sizeBefore / 20);
    expect(expectedCount).is.greaterThan(0);
    const handsBefore = new Map(game.players.map((p) => [p, p.cardsInHand.length]));

    player.defer(card.initialAction(player));
    runAllActions(game);

    // Some seeded copies may have already been drawn into a hand by the "everyone draws 3"
    // step below, so count everywhere a card can be, not just the deck itself.
    const everywhere = [
      ...game.projectDeck.drawPile,
      ...game.projectDeck.discardPile,
      ...game.players.flatMap((p) => p.cardsInHand),
    ];
    const deadDrops = everywhere.filter((c) => c.name === CardName.DEAD_DROP);
    expect(deadDrops).to.have.length(expectedCount);
    // +expectedCount for the seeded Dead Drops, -3 per player for the draw.
    expect(game.projectDeck.size()).to.eq(sizeBefore + expectedCount - 3 * game.players.length);

    for (const p of game.players) {
      expect(p.cardsInHand.length).to.eq((handsBefore.get(p) ?? 0) + 3);
    }
  });

  it('ignores any card played that is not Dead Drop', () => {
    const megaCreditsBefore = player.megaCredits;
    card.onCardPlayedByAnyPlayer(player, fakeCard({}), opponent);
    runAllActions(game);
    expect(player.megaCredits).to.eq(megaCreditsBefore);
  });

  describe('front side', () => {
    it('cannot act with an empty hand', () => {
      player.cardsInHand = [];
      expect(card.canAct(player)).is.false;
    });

    it('can act with a card in hand', () => {
      player.cardsInHand = [fakeCard({})];
      expect(card.canAct(player)).is.true;
    });

    it('action discards a card and hides a Dead Drop within the top 8 of the deck', () => {
      const discardable = fakeCard({});
      player.cardsInHand = [discardable];

      card.action(player);
      runAllActions(game);

      expect(game.projectDeck.discardPile).to.include(discardable);
      const drawPile = game.projectDeck.drawPile;
      const top8 = drawPile.slice(Math.max(0, drawPile.length - 8));
      expect(top8.some((c) => c.name === CardName.DEAD_DROP)).is.true;
    });

    it('the owner playing Dead Drop gains 5 M€ and flips to the back side', () => {
      const megaCreditsBefore = player.megaCredits;
      card.onCardPlayedByAnyPlayer(player, deadDropCard(), player);
      runAllActions(game);

      expect(player.megaCredits).to.eq(megaCreditsBefore + 5);
      // The action only exists on the front side.
      player.cardsInHand = [fakeCard({})];
      expect(card.canAct(player)).is.false;
    });

    it('an opponent playing Dead Drop also gains the owner 5 M€ and flips it', () => {
      const megaCreditsBefore = player.megaCredits;
      card.onCardPlayedByAnyPlayer(player, deadDropCard(), opponent);
      runAllActions(game);

      expect(player.megaCredits).to.eq(megaCreditsBefore + 5);
    });
  });

  describe('once flipped to its back side', () => {
    beforeEach(() => {
      card.onCardPlayedByAnyPlayer(player, deadDropCard(), player);
      runAllActions(game);
    });

    it('has no action, regardless of hand size', () => {
      player.cardsInHand = [fakeCard({})];
      expect(card.canAct(player)).is.false;
      player.cardsInHand = [];
      expect(card.canAct(player)).is.false;
    });

    it('the owner playing Dead Drop again lets them look at 2 cards and keep 1', () => {
      card.onCardPlayedByAnyPlayer(player, deadDropCard(), player);
      runAllActions(game);

      const selectCard = cast(player.popWaitingFor(), SelectCard);
      expect(selectCard.cards).has.lengthOf(2);
      const cardsInHandBefore = player.cardsInHand.length;
      selectCard.cb([selectCard.cards[0]]);
      runAllActions(game);

      expect(player.cardsInHand.length).to.eq(cardsInHandBefore + 1);
    });

    it('an opponent playing Dead Drop costs the owner 1 TR and flips it back to the front', () => {
      const trBefore = player.terraformRating;
      card.onCardPlayedByAnyPlayer(player, deadDropCard(), opponent);
      runAllActions(game);

      expect(player.terraformRating).to.eq(trBefore - 1);

      // Back on the front side now: playing Dead Drop pays out and flips forward once more.
      const megaCreditsBefore = player.megaCredits;
      card.onCardPlayedByAnyPlayer(player, deadDropCard(), opponent);
      runAllActions(game);
      expect(player.megaCredits).to.eq(megaCreditsBefore + 5);
    });
  });

  it('round-trips flipped state through serialize/deserialize', () => {
    card.onCardPlayedByAnyPlayer(player, deadDropCard(), player);
    runAllActions(game);

    const serialized: any = {name: card.name};
    card.serialize(serialized);
    expect(serialized.data).to.deep.eq({flipped: true});

    const restored = new CutoutNetworks();
    restored.deserialize(serialized);

    // Still flipped (back side): the owner playing Dead Drop triggers the reveal-2-keep-1
    // effect, not another 5 M€ payout, and the action remains unavailable.
    player.cardsInHand = [fakeCard({})];
    expect(restored.canAct(player)).is.false;

    const megaCreditsBefore = player.megaCredits;
    restored.onCardPlayedByAnyPlayer(player, deadDropCard(), player);
    runAllActions(game);
    expect(player.megaCredits).to.eq(megaCreditsBefore);
    expect(player.popWaitingFor()).to.not.eq(undefined);
  });
});
