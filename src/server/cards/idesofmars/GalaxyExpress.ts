import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {all} from '../Options';
import {PartyName} from '@/common/turmoil/PartyName';
import {Size} from '@/common/cards/render/Size';
import {VenusPhase2Expansion} from '@/server/venusPhase2/VenusPhase2Expansion';

export class GalaxyExpress extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GALAXY_EXPRESS,
      tags: [Tag.SPACE],
      cost: 12,
      victoryPoints: 1,
      requirements: {party: PartyName.UNITY},

      behavior: {
        production: {energy: -1},
      },

      metadata: {
        cardNumber: 'Im63',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.megacredits(1).slash().city({size: Size.SMALL, all}).asterix().br;
            pb.megacredits(1).slash().colonyTile({size: Size.SMALL, all}).asterix();
          }).nbsp;
          b.production((pb) => pb.minus().energy(1));
        }),
        description: 'Increase your M€ production 1 step for each city tile not on Mars and each colony tile ' +
          'with at least 1 colony. Decrease your energy production 1 step.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const cities = game.board.getCitiesOffMars().length + VenusPhase2Expansion.getCitiesCount(game);
    const colonyTiles = game.colonies.filter((colony) => colony.colonies.length > 0).length;
    player.production.add(Resource.MEGACREDITS, cities + colonyTiles, {log: true});
    return undefined;
  }
}
