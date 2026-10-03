import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ExtraplanetaryUrbanizator extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.EXTRAPLANETARY_URBANIZATOR,
      tags: [Tag.BUILDING, Tag.SPACE, Tag.GALACTIC],
      cost: 70,

      requirements: {tr: 40},
      victoryPoints: {tag: Tag.GALACTIC, each: 3},

      action: {
        city: {},
        production: {megacredits: 1},
      },

      metadata: {
        cardNumber: 'SL04',
        renderData: CardRenderer.builder((b) => {
          b.action('Place a city tile and increase your M€ production 1 step.', (eb) => {
            eb.empty().startAction.city().production((pb) => pb.megacredits(1));
          }).br;
          b.vpText('3 VP for each Galactic tag you have, including this.');
        }),
        description: 'Requires a terraform rating of at least 40.',
      },
    });
  }
}
