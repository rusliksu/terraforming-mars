import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {TileType} from '../../../common/TileType';

export class SyntheticGargantuaTrees extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SYNTHETIC_GARGANTUA_TREES,
      tags: [Tag.PLANT, Tag.SPACE, Tag.GALACTIC],
      cost: 68,

      requirements: {tag: Tag.PLANT, count: 5},
      victoryPoints: {tag: Tag.GALACTIC, each: 3},

      // Deliberately a plain tile placement: unlike the normal greenery action, this does
      // NOT raise oxygen (implemented literally as printed on the card).
      action: {
        tile: {
          type: TileType.GREENERY,
          on: 'greenery',
        },
      },

      metadata: {
        cardNumber: 'SL07',
        renderData: CardRenderer.builder((b) => {
          b.action('Place a greenery tile. THIS DOES NOT RAISE OXYGEN.', (eb) => {
            eb.empty().startAction.greenery({withO2: false});
          }).br;
          b.vpText('3 VP for each Galactic tag you have, including this.');
        }),
        description: 'Requires 5 Plant tags.',
      },
    });
  }
}
