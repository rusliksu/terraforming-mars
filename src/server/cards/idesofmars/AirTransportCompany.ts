import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {CardResource} from '../../../common/CardResource';
import {SelectCard} from '../../inputs/SelectCard';
import {SelectAmount} from '../../inputs/SelectAmount';
import {CardRenderer} from '../render/CardRenderer';

export class AirTransportCompany extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.AIR_TRANSPORT_COMPANY,
      tags: [Tag.VENUS],
      cost: 9,
      victoryPoints: 1,

      requirements: {tag: Tag.VENUS, count: 2},

      behavior: {
        addResourcesToAnyCard: {type: CardResource.FLOATER, count: 2},
      },

      metadata: {
        cardNumber: 'I49',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.FLOATER, 2).asterix();
        }),
        description: 'Requires that you own at least 2 Venus tags. Add 2 floaters to any card. ' +
          'Move up to 4 floaters between two cards of yours.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const sources = player.getResourceCards(CardResource.FLOATER).filter((card) => card.resourceCount > 0);
    if (sources.length === 0) {
      return undefined;
    }
    return new SelectCard('Select card to move floaters from (up to 4)', 'Select', sources)
      .andThen(([source]) => {
        const maxToMove = Math.min(4, source.resourceCount);
        return new SelectAmount('Select amount of floaters to move', 'Move', 0, maxToMove)
          .andThen((amount) => {
            if (amount <= 0) {
              return undefined;
            }
            const destinations = player.getResourceCards(CardResource.FLOATER).filter((card) => card.name !== source.name);
            if (destinations.length === 0) {
              return undefined;
            }
            return new SelectCard('Select card to move floaters to', 'Select', destinations)
              .andThen(([destination]) => {
                player.removeResourceFrom(source, amount, {log: true});
                player.addResourceTo(destination, {qty: amount, log: true});
                return undefined;
              });
          });
      });
  }
}
