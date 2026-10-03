import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {Units} from '../../../common/Units';

export class PlanetaryMuseum extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.PLANETARY_MUSEUM,
      tags: [Tag.BUILDING],
      cost: 19,

      metadata: {
        cardNumber: 'H48',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1));
          b.slash().diverseTag();
        }),
        description: 'Increase your M€ production 1 step for each different tag you have in play, including this.',
      },
    });
  }

  public productionBox(player: IPlayer): Units {
    return Units.of({megacredits: player.tags.distinctCount('default', Tag.BUILDING)});
  }

  public override bespokePlay(player: IPlayer) {
    player.production.adjust(this.productionBox(player), {log: true});
    return undefined;
  }
}
