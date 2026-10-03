import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class CropTheft extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.CROP_THEFT,
      tags: [Tag.PLANT],
      cost: 4,

      metadata: {
        cardNumber: 'X35',
        renderData: CardRenderer.builder((b) => {
          b.minus().plants(1, {all}).slash().tag(Tag.PLANT);
        }),
        description: 'Steal 1 plant from any player for each plant tag you have, including this.',
      },
    });
  }

  private amount(player: IPlayer): number {
    // +1 for this card, which isn't in the tableau yet.
    return player.tags.count(Tag.PLANT) + 1;
  }

  private stealTargets(player: IPlayer) {
    return player.opponents.filter((p) => p.plants > 0 && !p.plantsAreProtected());
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.stealTargets(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const targets = this.stealTargets(player);
    if (targets.length === 0) {
      return undefined;
    }
    const amount = this.amount(player);
    return new SelectPlayer(targets, 'Select a player to steal plants from', 'Steal')
      .andThen((target) => {
        target.attack(player, Resource.PLANTS, Math.min(amount, target.plants), {stealing: true, log: true});
        return undefined;
      });
  }
}
