import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {all} from '../Options';

export class GalaxyExpress extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GALAXY_EXPRESS,
      tags: [Tag.SPACE],
      cost: 16,

      metadata: {
        cardNumber: 'Im63',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(1).slash().colonies(1, {all});
        }),
        description: 'Increase your M€ by 1 for each colony your opponents own.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const opponentColonyCount = player.opponents.reduce((sum, opponent) => {
      return sum + player.game.colonies.reduce((colonySum, colony) => {
        return colonySum + colony.colonies.filter((owner) => owner === opponent.id).length;
      }, 0);
    }, 0);
    player.stock.add(Resource.MEGACREDITS, opponentColonyCount, {log: true});
    return undefined;
  }
}
