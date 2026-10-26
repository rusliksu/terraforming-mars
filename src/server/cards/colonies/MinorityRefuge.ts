import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {ColonyName} from '../../../common/colonies/ColonyName';
import {BuildColony} from '../../deferredActions/BuildColony';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';

export class MinorityRefuge extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 5,
      tags: [Tag.SPACE],
      name: CardName.MINORITY_REFUGE,
      type: CardType.AUTOMATED,

      metadata: {
        cardNumber: 'C26',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(-2)).colonies(1);
        }),
        description: 'Decrease your M€ production 2 steps. Place a colony.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const colonies = player.colonies.getPlayableColonies(false, 0, 2);
    if (colonies.length === 0) {
      return false;
    }
    if (player.production.megacredits <= -4 && colonies.every((colony) => colony.name === ColonyName.LUNA)) {
      this.addWarning('buildOnLuna');
    }
    return true;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new BuildColony(player, {
      title: 'Select colony for Minority Refuge',
      colonies: player.colonies.getPlayableColonies(false, 0, 2),
    })).andThen(() => player.production.add(Resource.MEGACREDITS, -2));
    return undefined;
  }
}
