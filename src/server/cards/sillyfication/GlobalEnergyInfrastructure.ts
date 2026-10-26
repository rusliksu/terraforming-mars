import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class GlobalEnergyInfrastructure extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.GLOBAL_ENERGY_INFRASTRUCTURE,
      tags: [Tag.POWER],
      cost: 22,

      requirements: {tag: Tag.POWER, count: 2},

      behavior: {
        production: {energy: 3},
      },

      metadata: {
        cardNumber: 'X34',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a power tag, including this, gain 1 energy production.', (eb) => {
            eb.tag(Tag.POWER).startEffect.production((pb) => pb.energy(1));
          }).br;
          b.production((pb) => pb.energy(3));
        }),
        description: 'Requires 2 power tags. Increase your energy production 3 steps.',
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if (card.tags.includes(Tag.POWER)) {
      player.production.add(Resource.ENERGY, 1, {log: true});
    }
  }
}
