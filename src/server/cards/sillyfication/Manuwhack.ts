import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class Manuwhack extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MANUWHACK,
      tags: [Tag.BUILDING],
      cost: 20,
      victoryPoints: 3,

      requirements: {tag: Tag.BUILDING, count: 5},

      metadata: {
        cardNumber: 'T10',
        renderData: CardRenderer.builder((b) => {
          b.effect('When any player gains production, every player gains 1 of that resource type (no matter the amount).', (eb) => {
            eb.production((pb) => pb.wild(1, {all})).startEffect.wild(1, {all});
          });
        }),
        description: 'Requires 5 building tags.',
      },
    });
  }

  public onProductionGainByAnyPlayer(cardOwner: IPlayer, _activePlayer: IPlayer, resource: Resource, amount: number) {
    if (amount <= 0) {
      return;
    }
    for (const p of cardOwner.game.players) {
      p.stock.add(resource, 1, {log: true});
    }
  }
}
