import {IProjectCard} from '../IProjectCard';
import {ICard, IActionCard} from '../ICard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PartyName} from '../../../common/turmoil/PartyName';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {newProjectCard} from '../../createCard';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {message} from '../../logs/MessageBuilder';

type SpaceportData = {capturedCard?: CardName};

/**
 * Holds one Space Event this player has played, for a later, cheaper replay.
 *
 * New mechanic: `data.capturedCard` records the name of the event card removed from this
 * player's tableau and "placed on" this card (see `onCardPlayed`). `action` reconstructs a
 * fresh instance of that card to replay it, then removes it from the game for good.
 */
export class UtopiaPlanitiaSpaceport extends Card implements IProjectCard, IActionCard {
  public data: SpaceportData = {};

  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.UTOPIA_PLANITIA_SPACEPORT,
      tags: [Tag.MARS, Tag.POWER],
      cost: 24,
      victoryPoints: 2,

      requirements: {party: PartyName.UNITY},

      metadata: {
        cardNumber: 'H15',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a Space Event, you may place it on this card.', (eb) => {
            eb.tag(Tag.SPACE).cards(1, {secondaryTag: Tag.EVENT, size: Size.SMALL}).startEffect.cards(1, {size: Size.SMALL});
          }).br;
          b.action('Play the Space Event placed here again, paying 8 M€ less. Increase your TR 1 step for each VP on it, then remove it from the game.', (ab) => {
            ab.empty().startAction.megacredits(-8);
          });
        }),
        description: 'Requires that Unity is ruling or that you have 2 delegates there. You can only have ' +
          'one Space Event at a time on this card.',
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): PlayerInput | undefined {
    if (this.data.capturedCard !== undefined) {
      return undefined;
    }
    if (card.type !== CardType.EVENT || !card.tags.includes(Tag.SPACE)) {
      return undefined;
    }
    const eventCard = card as IProjectCard;

    return new OrOptions(
      new SelectOption(message('Place ${0} on ${1}', (b) => b.card(eventCard).card(this)), 'Place')
        .andThen(() => {
          player.playedCards.remove(eventCard);
          this.data = {capturedCard: eventCard.name};
          player.game.log('${0} placed ${1} on ${2}', (b) => b.player(player).card(eventCard).card(this));
          return undefined;
        }),
      new SelectOption(message('Do not place ${0} on ${1}', (b) => b.card(eventCard).card(this))),
    );
  }

  public canAct(_player: IPlayer): boolean {
    return this.data.capturedCard !== undefined;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const cardName = this.data.capturedCard;
    if (cardName === undefined) {
      return undefined;
    }
    const card = newProjectCard(cardName);
    if (card === undefined) {
      return undefined;
    }

    const cost = Math.max(0, player.getCardCost(card) - 8);
    player.game.defer(new SelectPaymentDeferred(player, cost, {title: message('Select how to pay to replay ${0}', (b) => b.card(card))}))
      .andThen(() => {
        player.playCard(card, undefined, 'nothing');
        const vp = card.getVictoryPoints(player);
        if (vp > 0) {
          player.increaseTerraformRating(vp, {log: true});
        }
        player.removedFromPlayCards.push(card);
        this.data = {};
        return undefined;
      });
    return undefined;
  }
}
