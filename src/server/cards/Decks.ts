import {SerializedDeck} from '@/server/cards/SerializedDeck';
import {ceosFromJSON, corporationCardsFromJSON, preludesFromJSON} from '@/server/createCard';
import {CardName} from '@/common/cards/CardName';
import {Random} from '@/common/utils/Random';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {Logger} from '@/server/logs/Logger';
import {IPreludeCard} from '@/server/cards/prelude/IPreludeCard';
import {ICeoCard} from '@/server/cards/ceos/ICeoCard';
import {Deck} from '@/server/cards/Deck';
import {restoreDynamicCards, serializeDynamicCards} from '@/server/cards/DynamicCardState';

export class CorporationDeck extends Deck<ICorporationCard> {
  public constructor(deck: Array<ICorporationCard>, discarded: Array<ICorporationCard>, random: Random) {
    super('corporation', deck, discarded, random);
  }

  public static deserialize(d: SerializedDeck, random: Random): Deck<ICorporationCard> {
    const deck = corporationCardsFromJSON(d.drawPile);
    const discarded = corporationCardsFromJSON(d.discardPile);
    return new CorporationDeck(deck, discarded, random);
  }
}

export class ProjectDeck extends Deck<IProjectCard> {
  public isCardAvailable?: (card: IProjectCard) => boolean;

  public constructor(deck: Array<IProjectCard>, discarded: Array<IProjectCard>, random: Random) {
    super('project', deck, discarded, random);
  }

  public override draw(logger: Logger, source: 'top' | 'bottom' = 'top'): IProjectCard | undefined {
    if (this.isCardAvailable === undefined) {
      return super.draw(logger, source);
    }
    const skipped: Array<IProjectCard> = [];
    let card = super.draw(logger, source);
    while (card !== undefined && !this.isCardAvailable(card)) {
      skipped.push(card);
      card = super.draw(logger, source);
    }
    // Keep skipped cards out of reshuffles until this draw has finished.
    this.discard(...skipped);
    return card;
  }

  public override serialize(): SerializedDeck {
    const saved = super.serialize();
    const drawPileState = serializeDynamicCards(this.drawPile);
    const discardPileState = serializeDynamicCards(this.discardPile);
    if (drawPileState !== undefined) {
      saved.drawPileState = drawPileState;
    }
    if (discardPileState !== undefined) {
      saved.discardPileState = discardPileState;
    }
    return saved;
  }

  public drawByConditionOrThrow(logger: Logger, total: number, include: (card: IProjectCard) => boolean) {
    const result: Array<IProjectCard> = [];
    const discardedCards = new Array<CardName>();

    while (result.length < total) {
      if (discardedCards.length >= this.drawPile.length + this.discardPile.length) {
        logger.log(`discarded every ${this.type} card without a match`);
        break;
      }
      const projectCard = this.draw(logger);
      if (projectCard === undefined) {
        break;
      }
      if (include(projectCard)) {
        result.push(projectCard);
      } else {
        discardedCards.push(projectCard.name);
        this.discard(projectCard);
      }
    }
    if (discardedCards.length > 0) {
      logger.log('Discarded ${0} cards ${1}', (b) => b.number(discardedCards.length).cardNames(discardedCards, {ellipsis: true}));
    }

    return result;
  }

  public static deserialize(d: SerializedDeck, random: Random): ProjectDeck {
    const deck = restoreDynamicCards(d.drawPile, d.drawPileState);
    const discarded = restoreDynamicCards(d.discardPile, d.discardPileState);
    return new ProjectDeck(deck, discarded, random);
  }
}

const INCOMPATIBLE_PRELUDES = [CardName.BY_ELECTION, CardName.THE_NEW_SPACE_RACE] as const;
export class PreludeDeck extends Deck<IPreludeCard> {
  public constructor(deck: Array<IPreludeCard>, discarded: Array<IPreludeCard>, random: Random) {
    const copy = [...deck];
    const indexes = INCOMPATIBLE_PRELUDES.map((name) => deck.findIndex((c) => c.name === name));
    if (indexes[0] >= 0 && indexes[1] >= 0) {
      // Remove one from the game, randomly
      const target = random.nextInt(2);
      const indexToRemove = indexes[target];
      copy.splice(indexToRemove, 1);
    }

    super('prelude', copy, discarded, random);
  }

  public static deserialize(d: SerializedDeck, random: Random): Deck<IPreludeCard> {
    const deck = preludesFromJSON(d.drawPile);
    const discarded = preludesFromJSON(d.discardPile);
    return new PreludeDeck(deck, discarded, random);
  }
}

export class CeoDeck extends Deck<ICeoCard> {
  public constructor(deck: Array<ICeoCard>, discarded: Array<ICeoCard>, random: Random) {
    super('ceo', deck, discarded, random);
  }

  public static deserialize(d: SerializedDeck, random: Random): Deck<ICeoCard> {
    const deck = ceosFromJSON(d.drawPile);
    const discarded = ceosFromJSON(d.discardPile);
    return new CeoDeck(deck, discarded, random);
  }
}
