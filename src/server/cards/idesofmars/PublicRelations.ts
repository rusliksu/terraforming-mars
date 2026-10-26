import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Passive continuous rule: this card has no action or "Effect:" trigger of its own, just a
 * standing exception to how negative VP is counted. See calculateVictoryPoints.ts, which checks
 * for CardName.PUBLIC_RELATIONS directly (same pattern as its existing Vermin/Underworld
 * special cases) since there's no other hook point for "don't count my own negative VP cards."
 */
export class PublicRelations extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PUBLIC_RELATIONS,
      tags: [Tag.EARTH, Tag.EARTH],
      cost: 14,

      behavior: {
        production: {megacredits: -1},
      },

      requirements: {tag: Tag.EARTH, count: 2},

      metadata: {
        cardNumber: 'IM125',
        renderData: CardRenderer.builder((b) => {
          b.effect('Negative VP cards you own do not count against you.', (eb) => {
            eb.minus().vpIcon().startEffect.text('0');
          });
          b.br;
          b.production((pb) => pb.minus().megacredits(1));
        }),
        description: 'Requires 2 Earth tags. Decrease your M€ production 1 step.',
      },
    });
  }
}
