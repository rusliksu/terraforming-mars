import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {GlobalParameter} from '../../../common/GlobalParameter';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ColdBlooded extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.COLD_BLOODED,
      tags: [Tag.ANIMAL],
      cost: 15,

      requirements: {oxygen: 5},

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}},

      metadata: {
        cardNumber: 'T06',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you raise the temperature, add an animal to this card for each step.', (eb) => {
            eb.temperature(1).startEffect.resource(CardResource.ANIMAL);
          }).br;
          b.vpText('1 VP per animal on this card.');
        }),
        description: 'Requires 5% oxygen.',
      },
    });
  }

  public onGlobalParameterIncrease(player: IPlayer, parameter: GlobalParameter, steps: number) {
    if (parameter === GlobalParameter.TEMPERATURE && steps > 0) {
      player.addResourceTo(this, {qty: steps, log: true});
    }
  }
}
