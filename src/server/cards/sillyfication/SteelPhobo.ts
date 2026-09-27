import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class SteelPhobo extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.STEEL_PHOBO,
      tags: [Tag.SPACE, Tag.BUILDING],
      cost: 16,

      behavior: {
        // The DSL only supports a +1 step, so the second step is applied in bespokePlay.
        steelValue: 1,
        titanumValue: -1,
      },

      metadata: {
        cardNumber: 'X46',
        renderData: CardRenderer.builder((b) => {
          b.effect('Each steel you have is worth 2 M€ extra.', (eb) => {
            eb.steel(1).startEffect.plus(Size.SMALL).megacredits(2);
          }).br;
          b.effect('Each titanium you have is worth 1 M€ less.', (eb) => {
            eb.titanium(1).startEffect.minus(Size.SMALL).megacredits(1);
          });
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.increaseSteelValue();
    return undefined;
  }

  public override onDiscard(player: IPlayer) {
    player.decreaseSteelValue();
  }
}
