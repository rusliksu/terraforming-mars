import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {SelectCard} from '../../inputs/SelectCard';
import {OrOptions} from '../../inputs/OrOptions';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {uppercase} from '../Options';
import {SerializedCard} from '../../SerializedCard';
import {newProjectCard} from '../../createCard';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';

export class OrganicWasteRecycling extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ORGANIC_WASTE_RECYCLING,
      tags: [Tag.MICROBE, Tag.PLANT],
      cost: 25,

      victoryPoints: {tag: Tag.MICROBE, per: 2},

      metadata: {
        cardNumber: 'H44',
        renderData: CardRenderer.builder((b) => {
          b.action('Place a Microbe or Plant card here and add resources to it, or add resources to a card here, equal to the number of cities you own.', (eb) => {
            eb.city().startAction.cards(1).asterix();
          }).br;
          b.text('EFFECT: A CARD HERE MAY BE PLAYED AS IF FROM HAND WITH ITS COST REDUCED BY THE NUMBER OF RESOURCES ON IT.', {size: Size.TINY, uppercase});
          b.br;
          b.vpText('1 VP per 2 Microbe tags you have.');
        }),
      },
    });
  }

  /**
   * The Microbe or Plant card hosted by Organic Waste Recycling. Not considered "played".
   *
   * This mirrors the base game's Self-replicating Robots, which also hosts a card from hand
   * and stores resources on it for a later cost-reduced play.
   */
  public targetCards: Array<IProjectCard> = [];

  public override getCardDiscount(_player: IPlayer, card: IProjectCard): number {
    return this.targetCards.find((c) => c.name === card.name)?.resourceCount ?? 0;
  }

  public canAct(player: IPlayer): boolean {
    return this.targetCards.length > 0 ||
      player.cardsInHand.some((card) => card.tags.some((tag) => tag === Tag.MICROBE || tag === Tag.PLANT));
  }

  public action(player: IPlayer) {
    const orOptions = new OrOptions();
    const cities = player.game.board.getCities(player).length + VenusPhase2Expansion.getCitiesCount(player.game, player);
    const selectableCards = player.cardsInHand.filter((card) => card.tags.some((tag) => tag === Tag.MICROBE || tag === Tag.PLANT));

    if (this.targetCards.length > 0) {
      orOptions.options.push(new SelectCard(
        `Select card here to add ${cities} resource(s) to`, 'Add resources', this.targetCards, {played: CardName.ORGANIC_WASTE_RECYCLING})
        .andThen(([card]) => {
          card.resourceCount += cities;
          player.game.log('${0} added ${1} resource(s) to ${2}', (b) => b.player(player).number(cities).card(card));
          return undefined;
        }));
    }

    if (selectableCards.length > 0) {
      orOptions.options.push(new SelectCard(
        'Select Microbe or Plant card to place on Organic Waste Recycling',
        'Place card', selectableCards,
        {played: CardName.ORGANIC_WASTE_RECYCLING}).andThen(
        ([card]) => {
          const projectCardIndex = player.cardsInHand.findIndex((c) => c.name === card.name);
          player.cardsInHand.splice(projectCardIndex, 1);
          this.targetCards.push(card);
          card.resourceCount = cities;
          player.game.log('${0} placed ${1} on ${2} with ${3} resource(s)', (b) => b.player(player).card(card).card(this).number(cities));
          return undefined;
        }));
    }

    return orOptions;
  }

  public serialize(serialized: SerializedCard): void {
    serialized.targetCards = this.targetCards.map((t) => {
      return {
        card: {name: t.name},
        resourceCount: t.resourceCount,
      };
    });
  }

  public deserialize(serialized: SerializedCard): void {
    if (serialized.targetCards !== undefined) {
      this.targetCards = [];
      serialized.targetCards.forEach((targetCard) => {
        const card = newProjectCard(targetCard.card.name);
        if (card !== undefined) {
          card.resourceCount = targetCard.resourceCount;
          this.targetCards.push(card);
        } else {
          console.warn('did not find card for OrganicWasteRecycling', targetCard);
        }
      });
    }
  }
}
