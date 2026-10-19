import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class BaseOnTitan extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.BASE_ON_TITAN,
      tags: [Tag.JOVIAN, Tag.SPACE],
      cost: 25,

      requirements: {tag: Tag.JOVIAN, count: 3},
      victoryPoints: {tag: Tag.JOVIAN},

      action: {
        spend: {titanium: 2},
        tr: 1,
      },

      metadata: {
        cardNumber: 'CB49',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 2 titanium to increase your terraform rating 1 step.', (eb) => {
            eb.titanium(2).startAction.tr(1);
          }).br;
          b.vpText('1 VP for each Jovian tag you have.');
        }),
        description: 'Requires 3 Jovian tags.',
      },
    });
  }
}
