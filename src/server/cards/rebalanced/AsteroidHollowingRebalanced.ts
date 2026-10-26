import {IProjectCard} from '@/server/cards/IProjectCard';
import {ActionCard} from '@/server/cards/ActionCard';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {CardResource} from '@/common/CardResource';
import {Tag} from '@/common/cards/Tag';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class AsteroidHollowingRebalanced extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ASTEROID_HOLLOWING_REBALANCED,
      tags: [Tag.SPACE],
      cost: 16,
      resourceType: CardResource.ASTEROID,

      action: {
        spend: {titanium: 1},
        production: {megacredits: 1},
        addResources: 1,
      },

      victoryPoints: {resourcesHere: {}},

      metadata: {
        cardNumber: 'X15',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 titanium to add 1 asteroid resource here and increase M€ production 1 step.', (eb) => {
            eb.titanium(1).startAction.resource(CardResource.ASTEROID).production((pb) => pb.megacredits(1));
          }).br;
          b.vpText('1 VP for each asteroid on this card.');
        }),
      },
    });
  }
}
