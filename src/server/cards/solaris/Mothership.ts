import {IActionCard, ICard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {Resource} from '../../../common/Resource';
import {SelectCard} from '../../inputs/SelectCard';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class Mothership extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MOTHERSHIP,
      tags: [Tag.SPACE],
      cost: 12,

      requirements: {tag: Tag.SPACE, count: 3},

      resourceType: CardResource.FIGHTER,
      // VP is based on THIS card's own fighter count only, not the fighters it distributes
      // to other cards.
      victoryPoints: {resourcesHere: {}, per: 3},

      metadata: {
        cardNumber: 'So44',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 energy to add 1 fighter resource each to up to 2 different fighter-capable cards (including this one).', (ab) => {
            ab.energy(1).startAction.resource(CardResource.FIGHTER);
          }).br;
          b.text('Up to 2 different cards.', {size: Size.SMALL}).br;
          b.vpText('1 VP for every 3 fighters on this card.');
        }),
        description: 'Requires 3 Space tags.',
      },
    });
  }

  // "Fighter-capable" cards: any of this player's own cards whose resourceType is Fighter,
  // whether or not they currently hold any fighters -- including this card itself.
  private targetCards(player: IPlayer): Array<ICard> {
    return player.getResourceCards(CardResource.FIGHTER);
  }

  public canAct(player: IPlayer): boolean {
    return player.energy >= 1 && this.targetCards(player).length > 0;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const cards = this.targetCards(player);
    const max = Math.min(2, cards.length);
    player.stock.deduct(Resource.ENERGY, 1, {log: true});
    return new SelectCard(
      'Select up to 2 cards to add 1 fighter resource to',
      'Add fighters',
      cards,
      {min: 1, max},
    ).andThen((selected) => {
      for (const target of selected) {
        player.addResourceTo(target, {qty: 1, log: true});
      }
      return undefined;
    });
  }
}
