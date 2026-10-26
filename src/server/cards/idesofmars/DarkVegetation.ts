import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class DarkVegetation extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.DARK_VEGETATION,
      tags: [Tag.PLANT],
      cost: 11,

      requirements: {oxygen: 7},

      metadata: {
        cardNumber: '144',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.heat(1).plants(1)).br;
          b.or().br;
          b.production((pb) => pb.plants(2)).nbsp.tag(Tag.PLANT, {amount: 3, digit});
        }),
        description: 'Requires 7% oxygen. Increase your heat and plant production 1 step each, or increase your ' +
          'plant production 2 steps if you have 3 or more plant tags.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    // "Including this" needs a manual +1: this card isn't in the player's tableau yet
    // at the time its own play() resolves (same idiom as EnergeticInfrastructures).
    const plantTags = player.tags.count(Tag.PLANT) + 1;
    if (plantTags >= 3) {
      player.production.add(Resource.PLANTS, 2, {log: true});
    } else {
      player.production.add(Resource.HEAT, 1, {log: true});
      player.production.add(Resource.PLANTS, 1, {log: true});
    }
    return undefined;
  }
}
