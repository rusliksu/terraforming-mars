import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class Microbetronics extends Card implements IProjectCard {
  /** Energy production steps already granted, so gains only apply to newly-crossed thresholds. */
  public data: number = 0;

  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MICROBETRONICS,
      tags: [Tag.MICROBE, Tag.POWER],
      cost: 7,

      metadata: {
        cardNumber: 'T31',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.energy(1).slash().tag(Tag.MICROBE, 2));
        }),
        description: 'Gain 1 energy production for every 2 microbe tags you have, including this one.',
      },
    });
  }

  private updateProduction(player: IPlayer) {
    const steps = Math.floor(player.tags.count(Tag.MICROBE) / 2);
    if (steps > this.data) {
      player.production.add(Resource.ENERGY, steps - this.data, {log: true});
      this.data = steps;
    }
  }

  public onCardPlayed(player: IPlayer, _card: ICard) {
    this.updateProduction(player);
  }
}
