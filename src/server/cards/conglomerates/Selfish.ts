import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {ConglomeratesExpansion} from '../../conglomerates/ConglomeratesExpansion';

export class Selfish extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SELFISH,
      tags: [Tag.EARTH],
      cost: 10,

      behavior: {
        production: {megacredits: 4},
      },

      metadata: {
        cardNumber: 'CG1',
        renderData: CardRenderer.builder((b) => {
          b.minus().coordination(1).nbsp.production((pb) => pb.megacredits(4));
        }),
        description: 'Spend 1 Coordination. Increase your M€ production 4 steps.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.conglomeratesData.coordination >= 1;
  }

  public override bespokePlay(player: IPlayer) {
    ConglomeratesExpansion.spendCoordination(player, 1, {log: true});
    return undefined;
  }
}
