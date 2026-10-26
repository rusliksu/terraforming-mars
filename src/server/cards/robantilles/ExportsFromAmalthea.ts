import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';

export class ExportsFromAmalthea extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.EXPORTS_FROM_AMALTHEA,
      tags: [Tag.JOVIAN, Tag.SPACE],
      cost: 24,
      victoryPoints: 2,

      behavior: {
        production: {megacredits: 4},
      },

      metadata: {
        cardNumber: 'H64',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(4));
        }),
        description: 'Requires that you have an offworld city tile. Increase your M€ production 4 steps.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.board.getCitiesOffMars(player).length > 0 || VenusPhase2Expansion.getCitiesCount(player.game, player) > 0;
  }
}
