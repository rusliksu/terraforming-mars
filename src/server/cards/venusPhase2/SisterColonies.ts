import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {BuildColony} from '../../deferredActions/BuildColony';
import {CardRenderer} from '../render/CardRenderer';

export class SisterColonies extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SISTER_COLONIES,
      tags: [Tag.SPACE],
      cost: 24,

      metadata: {
        cardNumber: 'V82',
        renderData: CardRenderer.builder((b) => {
          b.colonies(2);
        }),
        description: 'Place 2 colonies on 2 different colony tiles.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.colonies.getPlayableColonies().length >= 2;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new BuildColony(player, {title: 'Select colony 1 of 2 for Sister Colonies'}))
      .andThen((firstColony) => {
        player.game.defer(new BuildColony(player, {
          title: 'Select colony 2 of 2 for Sister Colonies',
          colonies: player.game.colonies.filter((colony) => colony.name !== firstColony?.name),
        }));
        return undefined;
      });
    return undefined;
  }
}
