import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {uppercase} from '../Options';

export class AdministrativeDelay extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.ADMINISTRATIVE_DELAY,
      tags: [],
      cost: 2,

      metadata: {
        cardNumber: 'Im116',
        renderData: CardRenderer.builder((b) => {
          b.text('This generation, you can choose to take 0 actions per turn and keep playing.', {uppercase});
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.administrativeDelayActiveGeneration = player.game.generation;
    return undefined;
  }
}
