import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {CardResource} from '@/common/CardResource';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {ActionCard} from '@/server/cards/ActionCard';

export class TitanAirScrappingRebalanced extends ActionCard implements IProjectCard {
  constructor() {
    super({
      cost: 21,
      tags: [Tag.JOVIAN],
      name: CardName.TITAN_AIRSCRAPPING_REBALANCED,
      type: CardType.ACTIVE,
      resourceType: CardResource.FLOATER,
      victoryPoints: 2,

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {
              spend: {resourcesHere: 2},
              tr: 1,
              title: 'Remove 2 floaters here to increase your TR 1 step',
            },
            {
              spend: {titanium: 1},
              addResources: 4,
              title: 'Spend 1 titanium to add 4 floaters here',
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'C43',
        renderData: CardRenderer.builder((b) => {
          b.titanium(1).arrow().resource(CardResource.FLOATER, 4).nbsp.or().br;
          b.resource(CardResource.FLOATER, 2).arrow().tr(1).br;

          b.plainText('Action: Spend 1 titanium to add 4 floaters here, or spend 2 floaters here to increase your TR 1 step.', /* parens */ true);
        }),
      },
    });
  }
}
