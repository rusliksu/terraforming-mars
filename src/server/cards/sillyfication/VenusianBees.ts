import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';

// "Insect" isn't a tag; bees carry animal and microbe tags.
export class VenusianBees extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.VENUSIAN_BEES,
      tags: [Tag.VENUS, Tag.ANIMAL, Tag.MICROBE],
      cost: 10,

      requirements: {venus: 14},

      metadata: {
        cardNumber: 'X08',
        description: 'Requires Venus 14%. Increase your plant production 1 step for each pair of microbe and plant tags you have, including this.',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(1).slash().tag(Tag.MICROBE).tag(Tag.PLANT));
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    // Count raw tags and hand each wild tag to whichever side is behind, so a
    // wild tag completes exactly one pair rather than counting for both.
    // The +1 microbe is this card, which isn't in the tableau yet.
    let microbe = player.tags.count(Tag.MICROBE, 'raw') + 1;
    let plant = player.tags.count(Tag.PLANT, 'raw');
    let wild = player.tags.count(Tag.WILD, 'raw');
    while (wild > 0) {
      if (microbe <= plant) {
        microbe++;
      } else {
        plant++;
      }
      wild--;
    }
    player.production.add(Resource.PLANTS, Math.min(microbe, plant), {log: true});
    return undefined;
  }
}
