import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Grants blanket protection against M€, steel and titanium removal.
 *
 * The protection itself is a name check on `CardName.MARTIAN_ARMED_FORCES` in
 * `Player.alloysAreProtected`/`Player.megacreditsAreProtected`, following the same pattern
 * as Lunar Security Stations. This card has no bespoke behavior of its own.
 */
export class MartianArmedForces extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MARTIAN_ARMED_FORCES,
      tags: [Tag.EARTH],
      cost: 13,
      victoryPoints: 2,

      metadata: {
        cardNumber: 'H16',
        renderData: CardRenderer.builder((b) => {
          b.effect('Opponents cannot remove your M€, steel or titanium.', (eb) => {
            eb.megacredits(1).steel(1).titanium(1).startEffect.text('protected');
          });
        }),
      },
    });
  }
}
