import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {PartyName} from '../../../common/turmoil/PartyName';
import {all} from '../Options';

export class PowerLinesHub extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.POWER_LINES_HUB,
      tags: [Tag.POWER, Tag.BUILDING],
      cost: 22,

      requirements: {party: PartyName.EMPOWER},

      behavior: {
        production: {energy: {tag: Tag.POWER, others: true}},
      },

      metadata: {
        cardNumber: 'SOL16',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.energy(1).slash().tag(Tag.POWER, {all}).asterix();
          });
        }),
        description: 'Requires that Empower are ruling or that you have 2 delegates there. Increase your energy production 1 step for each Power tag your opponents have, combined.',
      },
    });
  }
}
