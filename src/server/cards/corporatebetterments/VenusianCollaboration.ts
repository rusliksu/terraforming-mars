import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class VenusianCollaboration extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.VENUSIAN_COLLABORATION,
      tags: [Tag.MARS, Tag.VENUS],
      cost: 21,

      requirements: {floaters: 1},

      behavior: {
        addResourcesToAnyCard: {count: 3, type: CardResource.FLOATER},
      },

      metadata: {
        cardNumber: 'B14',
        renderData: CardRenderer.builder((b) => {
          b.text('1 TR and 1 heat production step for every 10% of Venus.', {size: Size.SMALL}).br;
          b.resource(CardResource.FLOATER, 3).asterix();
        }),
        description: 'Requires that you have at least 1 floater.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const steps = Math.floor(player.game.getVenusScaleLevel() / 10);
    if (steps > 0) {
      player.increaseTerraformRating(steps, {log: true});
      player.production.add(Resource.HEAT, steps, {log: true});
    }
    return undefined;
  }
}
