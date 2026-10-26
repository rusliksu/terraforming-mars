import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {CardRenderer} from '../render/CardRenderer';
import {LogHelper} from '../../LogHelper';

export class Bioreactors extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.BIOREACTORS_RA,
      tags: [Tag.MICROBE],
      cost: 19,
      victoryPoints: 1,

      requirements: {tag: Tag.SCIENCE, count: 2},

      metadata: {
        cardNumber: 'H36',
        renderData: CardRenderer.builder((b) => {
          b.effect('Every time you add a microbe to any card, add an additional one.', (eb) => {
            eb.resource(CardResource.MICROBE).startEffect.resource(CardResource.MICROBE);
          });
        }),
        description: 'Requires that you have at least 2 Science tags.',
      },
    });
  }

  // Mutates resourceCount directly instead of calling player.addResourceTo, so this doesn't
  // re-dispatch onResourceAdded and recurse into itself forever.
  public onResourceAdded(player: IPlayer, card: ICard, count: number) {
    if (count <= 0 || card.resourceType !== CardResource.MICROBE || card.resourceCount === undefined) {
      return;
    }
    card.resourceCount += 1;
    LogHelper.logAddResource(player, card, 1, {card: this});
  }
}
