import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';

export class TransmissionTowers extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.TRANSMISSION_TOWERS,
      tags: [Tag.VENUS, Tag.BUILDING],
      cost: 12,
      requirements: {venus: 8},

      behavior: {
        production: {megacredits: -1},
      },

      action: {},

      metadata: {
        cardNumber: 'V60',
        renderData: CardRenderer.builder((b) => {
          b.action('Gain 1 energy for each Floating Array you own on Venus.', (eb) => {
            eb.empty().startAction.energy(1).slash().tile(TileType.VENUS_FLOATER_ARRAY).asterix();
          });
        }),
        description: 'Requires Venus 8% or more. Decrease your M€ production 1 step.',
      },
    });
  }

  public override bespokeAction(player: IPlayer) {
    const count = VenusPhase2Expansion.spaces(player.game, TileType.VENUS_FLOATER_ARRAY, {ownedBy: player}).length;
    player.stock.add(Resource.ENERGY, count, {log: true, from: {card: this}});
    return undefined;
  }
}
