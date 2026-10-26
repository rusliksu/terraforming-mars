import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class PlotContamination extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.PLOT_CONTAMINATION,
      tags: [Tag.PLANT],
      cost: 7,

      metadata: {
        cardNumber: 'I10',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(1)).asterix();
        }),
        description: 'If an opponent has a higher Plant production than you, increase your Plant production 1 step.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const myProduction = player.production.plants;
    if (player.opponents.some((opponent) => opponent.production.plants > myProduction)) {
      player.production.add(Resource.PLANTS, 1, {log: true});
    }
    return undefined;
  }
}
