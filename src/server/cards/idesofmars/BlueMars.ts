import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import * as constants from '../../../common/constants';

/**
 * Once all oceans have been placed, this card's replacement effect fires from
 * `PlaceOceanTile`, mirroring how Whales reacts to the same situation.
 */
export class BlueMars extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.BLUE_MARS,
      tags: [Tag.MARS],
      cost: 2,

      requirements: {oceans: constants.MAX_OCEAN_TILES},

      metadata: {
        cardNumber: 'I58',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you would place an ocean tile, raise your TR 1 step instead.', (eb) => {
            eb.oceans(1).startEffect.tr(1);
          });
        }),
        description: 'Requires that all oceans have been placed.',
      },
    });
  }
}
