import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {ColoniesHandler} from '../../colonies/ColoniesHandler';
import {CardRenderer} from '../render/CardRenderer';

/**
 * "Neutral" trade fleet: unlike a card that permanently grants a fleet (e.g. Ganymede Trading
 * Company's `colonies: {addTradeFleet: 1}`), this one is only lent out for the rest of the
 * generation. `this.data` marks that the fleet still needs to be taken back; onProductionPhase
 * (ICard's "reset between generations" hook) removes it exactly once, the next time production
 * runs. Reusing `player.colonies.coloniesTradeAction()` for the trade itself means the normal
 * trade-fee UI and colony.trade() bonus scaling (by colonies built there) apply unchanged --
 * the printed "collect colony bonus for each one of them" is just describing that existing rule.
 */
export class SpacePirates extends Card implements IProjectCard {
  /** True while the neutral trade fleet this card granted still needs to be taken back. */
  public data = false;

  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.SPACE_PIRATES,
      tags: [],
      cost: 8,

      metadata: {
        cardNumber: 'IM128',
        renderData: CardRenderer.builder((b) => {
          b.tradeFleet().nbsp.trade();
        }),
        description: 'Requires that the Colonies expansion is in play and at least one colony ' +
          'is tradeable. Gain 1 trade fleet and immediately trade with a colony. ' +
          'Remove that trade fleet at the start of the next generation.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const game = player.game;
    return game.gameOptions.coloniesExtension === true &&
      game.tradeEmbargo !== true &&
      ColoniesHandler.tradeableColonies(game).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.colonies.increaseFleetSize();
    this.data = true;
    return player.colonies.coloniesTradeAction();
  }

  public onProductionPhase(player: IPlayer): void {
    if (this.data === true) {
      player.colonies.decreaseFleetSize();
      this.data = false;
      player.game.log('${0} lost the neutral trade fleet granted by ${1}', (b) => b.player(player).card(this));
    }
  }
}
