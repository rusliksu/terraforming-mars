import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {ConglomeratesExpansion} from '../../conglomerates/ConglomeratesExpansion';

export class HelpRequest extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.HELP_REQUEST,
      cost: 7,

      metadata: {
        cardNumber: 'CG3',
        renderData: CardRenderer.builder((b) => {
          b.coordination(2, {teammate: true});
        }),
        description: 'Give 2 Coordination to your teammate.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.teammates().length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    for (const teammate of player.teammates()) {
      ConglomeratesExpansion.gainCoordination(teammate, 2, {log: true});
    }
    return undefined;
  }
}
