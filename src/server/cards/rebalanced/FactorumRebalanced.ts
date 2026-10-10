import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {IPlayer} from '@/server/IPlayer';
import {Tag} from '@/common/cards/Tag';
import {IActionCard} from '@/server/cards/ICard';
import {Resource} from '@/common/Resource';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Size} from '@/common/cards/render/Size';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';

export class FactorumRebalanced extends CorporationCard implements ICorporationCard, IActionCard {
  constructor() {
    super({
      name: CardName.FACTORUM_REBALANCED,
      tags: [Tag.POWER, Tag.BUILDING],
      startingMegaCredits: 40,

      behavior: {
        production: {steel: 2},
      },

      metadata: {
        cardNumber: 'R22',
        description: 'You start with 40 M€. Increase your steel production 2 steps.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(40).nbsp.production((pb) => pb.steel(2));
          b.corpBox('action', (ce) => {
            ce.vSpace(Size.LARGE);
            ce.br;
            ce.action('Increase your energy production 1 step IF YOU HAVE NO ENERGY RESOURCES, or spend 1 energy to draw a building card.', (eb) => {
              eb.empty().arrow().production((pb) => pb.energy(1)).asterix();
              eb.or().energy(1).startAction.cards(1, {secondaryTag: Tag.BUILDING});
            });
          });
        }),
      },
    });
  }

  public canAct(): boolean {
    return true;
  }

  public action(player: IPlayer) {
    if (player.energy > 0) {
      player.stock.deduct(Resource.ENERGY, 1);
      player.drawCard(1, {tag: Tag.BUILDING});
    } else {
      player.production.add(Resource.ENERGY, 1, {log: true});
    }
    return undefined;
  }
}
