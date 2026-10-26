import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {PartyName} from '../../../common/turmoil/PartyName';

export class Insurance extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.INSURANCE,
      tags: [Tag.EARTH],
      cost: 8,
      victoryPoints: 1,

      requirements: {party: PartyName.REDS},

      metadata: {
        cardNumber: 'T28',
        renderData: CardRenderer.builder((b) => {
          b.effect('Increase your M€ production 1 step for every step your Terraform Rating is below 20.', (eb) => {
            eb.tr(1).startEffect.production((pb) => pb.megacredits(1));
          });
        }),
        description: 'Requires that Reds are ruling or that you have 2 delegates there.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const steps = Math.max(0, 20 - player.terraformRating);
    if (steps > 0) {
      player.production.add(Resource.MEGACREDITS, steps, {log: true});
    }
    return undefined;
  }
}
