import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {digit} from '../Options';

export class HeatTrappersNetwork extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.HEAT_TRAPPERS_NETWORK,
      cost: 3,

      behavior: {
        production: {energy: -1},
      },

      action: {
        spend: {heat: 2},
      },

      metadata: {
        cardNumber: 'V61',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 2 heat to gain 1 M€ for each Gas Mine you own on Venus.', (eb) => {
            eb.heat(2, {digit}).startAction.megacredits(1).slash().tile(TileType.VENUS_GAS_MINE).asterix();
          });
        }),
        description: 'Decrease your energy production 1 step.',
      },
    });
  }

  public override bespokeAction(player: IPlayer) {
    const count = VenusPhase2Expansion.spaces(player.game, TileType.VENUS_GAS_MINE, {ownedBy: player}).length;
    player.stock.add(Resource.MEGACREDITS, count, {log: true, from: {card: this}});
    return undefined;
  }
}
