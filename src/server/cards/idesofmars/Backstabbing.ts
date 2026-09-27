import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';

export class Backstabbing extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.BACKSTABBING,
      tags: [],
      cost: 7,

      metadata: {
        cardNumber: 'Im124',
        renderData: CardRenderer.builder((b) => b.chairman().asterix()),
        description: 'This generation, if you have a delegate in a winning party, you become the chairman instead of the party leader.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.gameOptions.turmoilExtension;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.backstabbingPlayer = player.id;
    return undefined;
  }
}
