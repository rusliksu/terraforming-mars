import {IPlayer} from '../../../IPlayer';
import {CardName} from '../../../../common/cards/CardName';
import {CardRenderer} from '../../render/CardRenderer';
import {StandardProjectCard} from '../../StandardProjectCard';
import {PlaceCityTile} from '../../../deferredActions/PlaceCityTile';
import {Resource} from '../../../../common/Resource';

export class CityStandardProject extends StandardProjectCard {
  constructor() {
    super({
      name: CardName.CITY_STANDARD_PROJECT,
      cost: 25,
      metadata: {
        cardNumber: 'SP4',
        renderData: CardRenderer.builder((b) =>
          b.standardProject('Spend 25 M€ to place a city tile and increase your M€ production 1 step.', (eb) => {
            eb.megacredits(25).startAction.city().production((pb) => {
              pb.megacredits(1);
            });
          }),
        ),
      },
    });
  }

  public override canPayWith(player: IPlayer) {
    if (player.tableau.get(CardName.PREFABRICATION_OF_HUMAN_HABITATS) || player.tableau.get(CardName.BLOCKHOUSE)) {
      return {steel: true};
    } else {
      return {};
    }
  }

  public override canAct(player: IPlayer): boolean {
    // This is pricey because it forces calling canPlayOptions twice.
    if (player.game.board.getAvailableSpacesForCity(player, this.canPlayOptions(player)).length === 0) {
      return false;
    }
    if (!player.tableau.has(CardName.BLOCKHOUSE)) {
      return super.canAct(player);
    }
    // Blockhouse: steel is worth 2 M€ extra when paying for this standard project, but
    // the generic canAfford()/payingAmount() machinery has no notion of a payment-specific
    // value bonus. Temporarily reflect the bonus in the player's steel value (using the
    // same public mutators Advanced Alloys etc. use) so that machinery sees it, matching
    // the +2-per-steel bonus SelectStandardProjectToPlay.validate() already applies once a
    // payment is actually submitted.
    player.increaseSteelValue();
    player.increaseSteelValue();
    try {
      return super.canAct(player);
    } finally {
      player.decreaseSteelValue();
      player.decreaseSteelValue();
    }
  }

  actionEssence(player: IPlayer): void {
    player.game.defer(new PlaceCityTile(player));
    player.production.add(Resource.MEGACREDITS, 1);
  }
}
