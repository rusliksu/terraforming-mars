import {expect} from 'chai';
import {SignalUnion} from '../../../src/server/cards/sillyfication/SignalUnion';
import {Tag} from '../../../src/common/cards/Tag';
import {CardResource} from '../../../src/common/CardResource';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {fakeCard, finishGeneration, runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('SignalUnion', () => {
  let card: SignalUnion;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SignalUnion();
    [game, player] = testGame(1, {pathfindersExpansion: true});
    player.playedCards.push(card);
  });

  it('starts with 40 M€, 3 M€ production, and a Mars tag on its front side', () => {
    expect(card.startingMegaCredits).to.eq(40);
    expect(card.behavior).to.deep.eq({production: {megacredits: 3}});
    expect(card.tags).to.deep.eq([Tag.MARS]);
  });

  it('as its first action, draws 2 cards which can hold a data resource', () => {
    player.cardsInHand = [];
    player.defer(card.initialAction(player));
    runAllActions(game);

    expect(player.cardsInHand).to.have.length(2);
    expect(player.cardsInHand.every((c) => c.resourceType === CardResource.DATA)).is.true;
  });

  it('a single Mars tag played does not flip the card', () => {
    card.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
    runAllActions(game);
    expect(card.tags).to.deep.eq([Tag.MARS]);
  });

  it('the 2nd Mars tag this generation (a different card) adds 1 data to each data card and flips to Earth', () => {
    const dataCard1 = fakeCard({resourceType: CardResource.DATA});
    const dataCard2 = fakeCard({resourceType: CardResource.DATA});
    player.playedCards.push(dataCard1, dataCard2);

    card.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
    runAllActions(game);
    expect(card.tags).to.deep.eq([Tag.MARS]); // still front side after the first tag

    card.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
    runAllActions(game);

    expect(dataCard1.resourceCount).to.eq(1);
    expect(dataCard2.resourceCount).to.eq(1);
    expect(card.tags).to.deep.eq([Tag.EARTH]);
  });

  it('a single card carrying 2 Mars tags at once also triggers the flip', () => {
    card.onCardPlayed(player, fakeCard({tags: [Tag.MARS, Tag.MARS]}));
    runAllActions(game);
    expect(card.tags).to.deep.eq([Tag.EARTH]);
  });

  it("the corporation's own reveal counts toward its first-generation Mars tag total", () => {
    // onCardPlayed fires with the corp's own card (card === this) as part of its reveal, the
    // same way Pharmacy Union's own tags count toward its trigger - so just one more real
    // Mars tag that generation is enough to complete the "2nd tag" threshold.
    card.onCardPlayed(player, card);
    runAllActions(game);
    expect(card.tags).to.deep.eq([Tag.MARS]);

    card.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
    runAllActions(game);
    expect(card.tags).to.deep.eq([Tag.EARTH]);
  });

  it('has no action and cannot flip back mid-generation while on its Mars side', () => {
    expect(card.canAct(player)).is.false;
  });

  describe('once flipped to its Earth side', () => {
    let dataCard1: ReturnType<typeof fakeCard>;
    let dataCard2: ReturnType<typeof fakeCard>;

    beforeEach(() => {
      dataCard1 = fakeCard({resourceType: CardResource.DATA});
      dataCard2 = fakeCard({resourceType: CardResource.DATA});
      player.playedCards.push(dataCard1, dataCard2);
      card.onCardPlayed(player, fakeCard({tags: [Tag.MARS, Tag.MARS]}));
      runAllActions(game);
      expect(card.tags).to.deep.eq([Tag.EARTH]);
    });

    it('cannot act if no card holds any data', () => {
      dataCard1.resourceCount = 0;
      dataCard2.resourceCount = 0;
      expect(card.canAct(player)).is.false;
    });

    it('can act once a card holds data', () => {
      expect(card.canAct(player)).is.true;
    });

    it('action removes 1 data from each selected card and gains 2 M€ per data removed', () => {
      const megaCreditsBefore = player.megaCredits;
      const selectCard = cast(card.action(player), SelectCard);
      expect(selectCard.cards).to.have.members([dataCard1, dataCard2]);
      selectCard.cb([dataCard1, dataCard2]);

      expect(dataCard1.resourceCount).to.eq(0);
      expect(dataCard2.resourceCount).to.eq(0);
      expect(player.megaCredits).to.eq(megaCreditsBefore + 4);
    });

    it('selecting no cards gains nothing', () => {
      const megaCreditsBefore = player.megaCredits;
      const selectCard = cast(card.action(player), SelectCard);
      selectCard.cb([]);

      expect(dataCard1.resourceCount).to.eq(1);
      expect(player.megaCredits).to.eq(megaCreditsBefore);
    });

    it('flips back to Mars at the end of the generation, regardless of whether the action was used', () => {
      finishGeneration(game);
      expect(card.tags).to.deep.eq([Tag.MARS]);
    });

    it('a fresh Mars tag next generation only needs 2 more to flip again', () => {
      finishGeneration(game);
      expect(card.tags).to.deep.eq([Tag.MARS]);

      card.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
      runAllActions(game);
      expect(card.tags).to.deep.eq([Tag.MARS]);

      card.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
      runAllActions(game);
      expect(card.tags).to.deep.eq([Tag.EARTH]);
    });
  });

  it('round-trips flipped state and the Mars tag counter through serialize/deserialize', () => {
    card.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
    runAllActions(game);

    const serialized: any = {name: card.name};
    card.serialize(serialized);
    expect(serialized.data).to.deep.eq({flipped: false, marsTagsThisGeneration: 1});

    const restored = new SignalUnion();
    restored.deserialize(serialized);
    expect(restored.tags).to.deep.eq([Tag.MARS]);

    restored.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
    runAllActions(game);
    expect(restored.tags).to.deep.eq([Tag.EARTH]);
  });
});
