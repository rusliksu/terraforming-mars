import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class SmeltingPods extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SMELTING_PODS,
      tags: [Tag.BUILDING],
      cost: 15,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'T09',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a building tag, including this, you may pay 4 steel to increase your heat production 2 steps.', (eb) => {
            eb.tag(Tag.BUILDING).startEffect.minus().steel(4, {digit}).nbsp.production((pb) => pb.heat(2));
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if (!card.tags.includes(Tag.BUILDING) || player.steel < 4) {
      return undefined;
    }
    return new OrOptions(
      new SelectOption('Pay 4 steel to increase your heat production 2 steps').andThen(() => {
        player.stock.deduct(Resource.STEEL, 4);
        player.production.add(Resource.HEAT, 2, {log: true});
        return undefined;
      }),
      new SelectOption('Do not pay'),
    );
  }
}
