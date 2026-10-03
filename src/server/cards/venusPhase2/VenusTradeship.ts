import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {Resource} from '../../../common/Resource';
import {CardResource} from '../../../common/CardResource';
import {SelectAmount} from '../../inputs/SelectAmount';
import {SelectCard} from '../../inputs/SelectCard';
import {CardRenderer} from '../render/CardRenderer';

export class VenusTradeship extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.VENUS_TRADESHIP,
      tags: [Tag.VENUS],
      cost: 0,

      metadata: {
        cardNumber: 'V92',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Costs 2 M€ per X. Choose X cards that collect floaters and add 1 floater to each.', true);
        }),
      },
    });
  }

  private eligibleCards(player: IPlayer): Array<ICard> {
    return player.getResourceCards(CardResource.FLOATER);
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.eligibleCards(player).length > 0 && player.stock.megacredits >= 2;
  }

  public override bespokePlay(player: IPlayer) {
    const cards = this.eligibleCards(player);
    const maxX = Math.min(cards.length, Math.floor(player.stock.megacredits / 2));
    player.defer(() => new SelectAmount('Select how many cards to add a floater to (2 M€ each)', 'Select', 1, maxX)
      .andThen((x) => {
        player.stock.deduct(Resource.MEGACREDITS, 2 * x, {log: true});
        player.defer(() => new SelectCard('Select cards to add 1 floater to', 'Add floaters', cards, {min: x, max: x})
          .andThen((selected) => {
            for (const card of selected) {
              player.addResourceTo(card, {qty: 1, log: true});
            }
            return undefined;
          }));
        return undefined;
      }));
    return undefined;
  }
}
