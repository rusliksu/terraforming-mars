import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';
import * as DynamicVictoryPoints from '../render/DynamicVictoryPoints';

export class TempleOfGaiaAtElysium extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.TEMPLE_OF_GAIA_AT_ELYSIUM,
      tags: [Tag.MARS, Tag.BUILDING, Tag.PLANT],
      cost: 25,

      requirements: {party: PartyName.GREENS},
      victoryPoints: 'special',

      metadata: {
        cardNumber: 'H31',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(1)).slash().greenery().br;
          b.vpText('1 VP for every 3 greenery tiles you own.');
        }),
        // No dedicated "greeneries" VP icon helper exists (unlike DynamicVictoryPoints.cities),
        // so this uses a generic questionmark placeholder icon, same as RedCity.ts.
        victoryPoints: DynamicVictoryPoints.questionmark(1, 3),
        description: 'Requires that the Greens are ruling or that you have 2 delegates there. ' +
          'Increase your plant production 1 step for each greenery tile you own.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const count = player.game.board.getGreeneries(player).length;
    if (count > 0) {
      player.production.add(Resource.PLANTS, count, {log: true});
    }
    return undefined;
  }

  public override getVictoryPoints(player: IPlayer): number {
    return Math.floor(player.game.board.getGreeneries(player).length / 3);
  }
}
