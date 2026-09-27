import {StandardActionCard} from '../../StandardActionCard';
import {CardName} from '../../../../common/cards/CardName';
import {CardRenderer} from '../../render/CardRenderer';
import {IPlayer} from '../../../IPlayer';
import {MAX_OXYGEN_LEVEL} from '../../../../common/constants';
import {SelectSpace} from '../../../inputs/SelectSpace';
import {Units} from '../../../../common/Units';
import {message} from '../../../logs/MessageBuilder';
import {InsectPollinators} from '../../idesofmars/InsectPollinators';
import {Space} from '../../../boards/Space';


export class ConvertPlants extends StandardActionCard {
  constructor() {
    super({
      name: CardName.CONVERT_PLANTS,
      metadata: {
        cardNumber: 'SA2',
        renderData: CardRenderer.builder((b) =>
          b.standardProject('Spend 8 plants to place a greenery tile and raise oxygen 1 step.', (eb) => {
            eb.plants(8).startAction.greenery();
          }),
        ),
      },
    });
  }

  // Insect Pollinators (idesOfMars, fan): a greenery placed next to one of the acting
  // player's own greeneries costs 1 plant less. Cheapest cost across all currently
  // available spaces, used to gate canAct without knowing the space yet.
  private cheapestCost(player: IPlayer, spaces: ReadonlyArray<Space>): number {
    let min = player.plantsNeededForGreenery;
    for (const space of spaces) {
      const cost = player.plantsNeededForGreenery - InsectPollinators.getDiscount(player, space);
      if (cost < min) {
        min = cost;
      }
    }
    return min;
  }

  public canAct(player: IPlayer): boolean {
    const spaces = player.game.board.getAvailableSpacesForGreenery(player);
    if (spaces.length === 0) {
      return false;
    }
    const cost = this.cheapestCost(player, spaces);
    if (player.plants < cost) {
      return false;
    }
    if (player.game.getOxygenLevel() === MAX_OXYGEN_LEVEL) {
      // The level is maximized, and that means you don't have to try to figure out if the
      // player can afford the reds tax when increasing the oxygen level.
      return true;
    }
    return player.canAfford({
      cost: 0,
      tr: {oxygen: 1},
      reserveUnits: Units.of({plants: cost}),
    });
  }

  public action(player: IPlayer) {
    return new SelectSpace(
      message('Convert plants into a greenery'),
      player.game.board.getAvailableSpacesForGreenery(player))
      .andThen((space) => {
        this.actionUsed(player);
        player.game.addGreenery(player, space);
        player.plants -= player.plantsNeededForGreenery - InsectPollinators.getDiscount(player, space);
        return undefined;
      });
  }
}
