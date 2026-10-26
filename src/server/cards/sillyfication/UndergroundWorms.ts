import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ExcavateSpacesDeferred} from '../../underworld/ExcavateSpacesDeferred';
import {UnderworldExpansion} from '../../underworld/UnderworldExpansion';

export class UndergroundWorms extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.UNDERGROUND_WORMS,
      tags: [Tag.MICROBE],
      cost: 13,

      requirements: {oxygen: 6},

      resourceType: CardResource.MICROBE,
      victoryPoints: {resourcesHere: {}, per: 3},

      action: {
        spend: {resourcesHere: 2},
      },

      metadata: {
        cardNumber: 'T02',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you excavate a space, add a microbe to this card.', (eb) => {
            eb.empty().startEffect.resource(CardResource.MICROBE);
          }).br;
          b.action('Remove 2 microbes to excavate a space.', (eb) => {
            eb.resource(CardResource.MICROBE, {amount: 2}).startAction.excavate(1);
          });
        }),
        description: 'Requires 6% oxygen.',
      },
    });
  }

  public override bespokeCanAct(player: IPlayer): boolean {
    return UnderworldExpansion.canExcavateN(player, 1);
  }

  public override bespokeAction(player: IPlayer) {
    player.game.defer(new ExcavateSpacesDeferred(player, 1));
    return undefined;
  }

  public onClaim(player: IPlayer, isExcavate: boolean, _space: Space | undefined) {
    if (isExcavate) {
      player.addResourceTo(this, {qty: 1, log: true});
    }
  }
}
