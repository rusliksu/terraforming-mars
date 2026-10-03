import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import * as DynamicVictoryPoints from '../render/DynamicVictoryPoints';

export class OpeningOfNaturalReserves extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.OPENING_OF_NATURAL_RESERVES,
      tags: [Tag.ANIMAL],
      cost: 12,

      victoryPoints: 'special',

      metadata: {
        cardNumber: 'H39',
        renderData: CardRenderer.builder((b) => {
          b.vpText('1 VP per 4 Animals on all your other Animal cards.');
        }),
        victoryPoints: DynamicVictoryPoints.resource(CardResource.ANIMAL, 1, 4),
      },
    });
  }

  // This card holds no resources of its own, so summing every Animal-resource card the
  // player owns naturally counts only the OTHER Animal cards.
  public override getVictoryPoints(player: IPlayer): number {
    return Math.floor(player.getResourceCount(CardResource.ANIMAL) / 4);
  }
}
