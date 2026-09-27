import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {SelectCard} from '../../inputs/SelectCard';
import {SelectOption} from '../../inputs/SelectOption';
import {OrOptions} from '../../inputs/OrOptions';
import {DrawCards} from '../../deferredActions/DrawCards';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {uppercase} from '../Options';
import {SerializedCard} from '../../SerializedCard';
import {newProjectCard} from '../../createCard';

/**
 * Solaris' reimagining of Self-Replicating Robots. Unlike the original promo card (which links
 * a Space/Building card straight out of hand), this version reveals cards from the TOP OF THE
 * DECK -- discarding non-matching reveals along the way -- until it finds a Space or Building
 * card to host, per the Solaris card text ("reveal and place ... from the deck").
 *
 * Named with a "(Solaris)" suffix to avoid colliding with the existing
 * CardName.SELF_REPLICATING_ROBOTS ('Self-replicating Robots') promo card, which this is not a
 * reprint of.
 */
export class SelfReplicatingRobotsSolaris extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SELF_REPLICATING_ROBOTS_SOLARIS,
      cost: 7,

      requirements: {tag: Tag.SCIENCE, count: 2},
      metadata: {
        cardNumber: 'SL01',
        renderData: CardRenderer.builder((b) => {
          b.action('Reveal cards from the deck until you find a SPACE OR BUILDING card, place it here, and add 2 resources of its own type to it, OR double the resources on a card here.', (eb) => {
            eb.empty().startAction.selfReplicatingRobots();
            eb.nbsp.or().nbsp.arrow().multiplierWhite().text('x2');
          }).br;
          b.text('Effect: Card here may be played as if from hand with its cost reduced by the number of resources on it.', {size: Size.TINY, uppercase});
        }),
        description: 'Requires 2 Science tags.',
      },
    });
  }

  /**
   * Cards hosted by Self-Replicating Robots. They are not considered "played" cards.
   */
  public targetCards: Array<IProjectCard> = [];

  public override getCardDiscount(_player: IPlayer, card: IProjectCard): number {
    return this.targetCards.find((c) => c.name === card.name)?.resourceCount ?? 0;
  }

  public canAct(player: IPlayer): boolean {
    return this.targetCards.length > 0 || player.game.projectDeck.drawPile.length + player.game.projectDeck.discardPile.length > 0;
  }

  public action(player: IPlayer) {
    const orOptions = new OrOptions();

    if (this.targetCards.length > 0) {
      orOptions.options.push(new SelectCard(
        'Select card to double robots resource', 'Double resource', this.targetCards, {played: CardName.SELF_REPLICATING_ROBOTS_SOLARIS})
        .andThen(([card]) => {
          const resourceCount = card.resourceCount;
          card.resourceCount *= 2;
          player.game.log('${0} doubled resources on ${1} from ${2} to ${3}', (b) => {
            b.player(player).card(card).number(resourceCount).number(card.resourceCount);
          });
          return undefined;
        }));
    }

    if (player.game.projectDeck.drawPile.length + player.game.projectDeck.discardPile.length > 0) {
      orOptions.options.push(new SelectOption(
        'Reveal cards from the deck until you find a Space or Building card to link with this', 'Reveal')
        .andThen(() => {
          player.game.defer(new DrawCards(player, 1, {
            include: (card) => card.tags.includes(Tag.SPACE) || card.tags.includes(Tag.BUILDING),
          }).andThen((cards) => {
            const card = cards[0];
            if (card === undefined) {
              player.game.log('${0} found no Space or Building card in the deck', (b) => b.player(player));
              return undefined;
            }
            this.targetCards.push(card);
            card.resourceCount = 2;
            player.game.log('${0} linked ${1} with ${2}', (b) => b.player(player).card(card).card(this));
            return undefined;
          }));
          return undefined;
        }));
    }

    return orOptions;
  }

  serialize(serialized: SerializedCard): void {
    serialized.targetCards = this.targetCards.map((t) => {
      return {
        card: {name: t.name},
        resourceCount: t.resourceCount,
      };
    });
  }

  deserialize(serialized: SerializedCard): void {
    if (serialized.targetCards !== undefined) {
      this.targetCards = [];
      serialized.targetCards.forEach((targetCard) => {
        const card = newProjectCard(targetCard.card.name);
        if (card !== undefined) {
          card.resourceCount = targetCard.resourceCount;
          this.targetCards.push(card);
        } else {
          console.warn('did not find card for SelfReplicatingRobotsSolaris', targetCard);
        }
      });
    }
  }
}
