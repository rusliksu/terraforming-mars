import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {CorporationCard} from '../corporation/CorporationCard';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {ICard, IActionCard} from '../ICard';
import {PlayerInput} from '../../PlayerInput';
import {Priority} from '../../deferredActions/Priority';
import {SelectCard} from '../../inputs/SelectCard';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {AltSecondaryTag} from '../../../common/cards/render/AltSecondaryTag';
import {SerializedCard} from '../../SerializedCard';

const MC_PER_DATA_REMOVED = 2;

/**
 * A Pharmacy-Union-style flip corporation, gated to games with Pathfinders (both the Mars tag
 * and the data resource are Pathfinders concepts). Front side carries a Mars tag: once its
 * owner has played 2 Mars tags in a generation, it banks a data on every card that can hold
 * one, then flips to its Earth-tagged back side. Its own reveal carries a Mars tag too, so
 * (as with Pharmacy Union) that counts toward the very first generation's total - one more
 * real Mars tag played that generation is enough to flip it. The back side's action cashes
 * data back in for M€, and the card always flips back to its Mars side at the end of the
 * generation (win or lose the action).
 */
export class SignalUnion extends CorporationCard implements ICorporationCard, IActionCard {
  private flipped = false;
  private marsTagsThisGeneration = 0;

  constructor() {
    super({
      name: CardName.SIGNAL_UNION,
      startingMegaCredits: 40,

      behavior: {
        production: {megacredits: 3},
      },

      firstAction: {
        text: 'Draw 2 cards which can hold a data resource',
        drawCard: {count: 2, resource: CardResource.DATA},
      },

      metadata: {
        cardNumber: 'X00', // Renumber
        description: 'You start with 40 M€ and 3 M€ production. As your first action, draw 2 cards which can hold a data resource.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(40).nbsp.production((pb) => pb.megacredits(3)).br;
          b.cards(2, {secondaryTag: AltSecondaryTag.DATA}).br;
          b.corpBox('effect', (ce) => {
            ce.vSpace(Size.LARGE);
            ce.br;
            ce.effect('MARS SIDE. The 2nd time you play a Mars tag in a generation, add 1 data to each card that can hold it, then flip this card.', (eb) => {
              eb.tag(Tag.MARS, 2).startEffect.resource(CardResource.DATA).asterix();
            });
            ce.br;
            ce.vSpace();
            ce.br;
            ce.effect('EARTH SIDE. Action: Remove 1 data from any number of cards. Gain 2 M€ per data removed. At generation end, flip this card back.', (eb) => {
              eb.minus().resource(CardResource.DATA).asterix().startEffect.megacredits(2);
            });
          });
        }),
      },
    });
  }

  public override get tags(): Array<Tag> {
    return this.flipped ? [Tag.EARTH] : [Tag.MARS];
  }

  public onCardPlayed(player: IPlayer, card: ICard): PlayerInput | undefined {
    if (this.flipped) {
      return undefined;
    }
    const marsTags = player.tags.cardTagCount(card, Tag.MARS);
    if (marsTags === 0) {
      return undefined;
    }
    this.marsTagsThisGeneration += marsTags;
    if (this.marsTagsThisGeneration < 2) {
      return undefined;
    }
    player.defer(() => {
      const dataCards = player.getResourceCards(CardResource.DATA);
      for (const dataCard of dataCards) {
        player.addResourceTo(dataCard, {qty: 1, log: true});
      }
      player.playedCards.retagCard(this, () => {
        this.flipped = true;
      });
      player.game.log('${0} flipped ${1} to its Earth side', (b) => b.player(player).card(this));
      return undefined;
    }, Priority.DEFAULT);
    return undefined;
  }

  public canAct(player: IPlayer): boolean {
    return this.flipped && player.getResourceCards(CardResource.DATA).some((card) => card.resourceCount > 0);
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const candidates = player.getResourceCards(CardResource.DATA).filter((card) => card.resourceCount > 0);
    return new SelectCard(
      'Select cards to remove 1 data from (2 M€ each)',
      'Remove',
      candidates,
      {min: 0, max: candidates.length, showSelectAll: true},
    ).andThen((cards) => {
      for (const card of cards) {
        player.removeResourceFrom(card, 1, {log: true});
      }
      if (cards.length > 0) {
        player.stock.add(Resource.MEGACREDITS, cards.length * MC_PER_DATA_REMOVED, {log: true, from: {card: this}});
      }
      return undefined;
    });
  }

  public onProductionPhase(player: IPlayer): void {
    this.marsTagsThisGeneration = 0;
    if (this.flipped) {
      player.playedCards.retagCard(this, () => {
        this.flipped = false;
      });
      player.game.log('${0} flipped ${1} back to its Mars side', (b) => b.player(player).card(this));
    }
  }

  public serialize(serialized: SerializedCard): void {
    serialized.data = {flipped: this.flipped, marsTagsThisGeneration: this.marsTagsThisGeneration};
  }

  public deserialize(serialized: SerializedCard): void {
    const data = serialized.data as {flipped?: boolean, marsTagsThisGeneration?: number} | undefined;
    this.flipped = data?.flipped ?? false;
    this.marsTagsThisGeneration = data?.marsTagsThisGeneration ?? 0;
  }
}
