import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {Board} from '../../boards/Board';
import {Turmoil} from '../../turmoil/Turmoil';
import {CardRenderer} from '../render/CardRenderer';

export class MartianCensus extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MARTIAN_CENSUS,
      tags: [],
      cost: 9,

      requirements: {party: PartyName.POPULISTS},

      metadata: {
        cardNumber: 'SL31',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1)).slash().partyLeaders().br;
          b.megacredits(1).slash().city();
        }),
        description: 'Requires that Populists are ruling or that you have 2 delegates there. Increase your ' +
          'M€ production 1 step for every party you are the Leader of. Gain 1 M€ for every city tile you have in play.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const partyLeaderCount = turmoil.parties.filter((party) => party.partyLeader === player).length;
    if (partyLeaderCount > 0) {
      player.production.add(Resource.MEGACREDITS, partyLeaderCount, {log: true});
    }

    const cityCount = player.game.board.spaces.filter(
      (space) => Board.isCitySpace(space) && Board.spaceOwnedBy(space, player)).length;
    if (cityCount > 0) {
      player.stock.add(Resource.MEGACREDITS, cityCount, {log: true});
    }
    return undefined;
  }
}
