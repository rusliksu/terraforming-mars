import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {Resource} from '../../../common/Resource';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class WildBoars extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.WILD_BOARS,
      tags: [Tag.ANIMAL],
      cost: 12,

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}},
      requirements: {oxygen: 11},

      metadata: {
        cardNumber: 'CB26',
        renderData: CardRenderer.builder((b) => {
          b.action('Remove 1 plant from an opponent to add 1 animal to this card.', (eb) => {
            eb.minus().plants(1, {all}).startAction.resource(CardResource.ANIMAL);
          }).br;
          b.vpText('1 VP for each animal on this card.');
        }),
        description: 'Requires 11% oxygen.',
      },
    });
  }

  private targets(player: IPlayer) {
    return player.opponents.filter((p) => p.plants > 0 && !p.plantsAreProtected());
  }

  public canAct(player: IPlayer): boolean {
    return this.targets(player).length > 0;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const targets = this.targets(player);
    return new SelectPlayer(targets, 'Select a player to remove a plant from', 'Remove plant')
      .andThen((target) => {
        target.attack(player, Resource.PLANTS, 1, {stealing: true, log: true});
        player.addResourceTo(this, {qty: 1, log: true});
        return undefined;
      });
  }
}
