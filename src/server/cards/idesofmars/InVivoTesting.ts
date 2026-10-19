import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class InVivoTesting extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.IN_VIVO_TESTING,
      tags: [Tag.SCIENCE, Tag.MICROBE],
      cost: 0,
      victoryPoints: -1,

      requirements: {tag: Tag.SCIENCE},

      behavior: {
        or: {
          behaviors: [
            {
              title: 'Remove 3 microbes from a player',
              removeResourcesFromAnyCard: {type: CardResource.MICROBE, count: 3, source: 'all'},
            },
            {
              title: 'Remove 5 plants from a player',
              removeAnyPlants: 5,
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'I55',
        renderData: CardRenderer.builder((b) => {
          b.minus().resource(CardResource.MICROBE, {amount: 3, all}).nbsp.or().br;
          b.minus().plants(5, {all}).asterix();
        }),
        description: 'Requires that you own at least 1 Science tag. Remove 3 microbes or 5 plants from a player.',
      },
    });
  }
}
