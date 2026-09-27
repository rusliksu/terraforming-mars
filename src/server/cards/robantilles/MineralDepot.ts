import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectAmount} from '../../inputs/SelectAmount';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

const STEEL_RATE = 2;
const TITANIUM_RATE = 3;

/**
 * "You can exchange any number of Steel and Titanium resources for 2 M€ and 3 M€ and vice versa."
 * Implemented as a one-time (Event) resolution: the player may perform any number of individual
 * exchanges, in either direction, for either resource, in a single sitting when this is played --
 * modeled as a recursive OrOptions offer (same pattern as Company Incentives' repeated placements)
 * rather than a standing/ongoing ability, consistent with this card's Event type.
 */
export class MineralDepot extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.MINERAL_DEPOT,
      tags: [],
      cost: 5,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'H55',
        renderData: CardRenderer.builder((b) => {
          b.text(
            `Exchange any number of steel and titanium resources for ${STEEL_RATE} M€ and ${TITANIUM_RATE} M€ ` +
            'each, and vice versa.',
            {size: Size.SMALL, uppercase: true});
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    return this.offerExchange(player);
  }

  private offerExchange(player: IPlayer): PlayerInput | undefined {
    const options = new OrOptions();
    options.title = 'Select an exchange to make with Mineral Depot, or finish';

    if (player.steel > 0) {
      options.options.push(
        new SelectAmount(`Sell how many steel, for ${STEEL_RATE} M€ each?`, 'Sell steel', 1, player.steel)
          .andThen((amount) => {
            player.stock.deduct(Resource.STEEL, amount, {log: true});
            player.stock.add(Resource.MEGACREDITS, amount * STEEL_RATE, {log: true});
            this.continueExchange(player);
            return undefined;
          }));
    }
    if (player.titanium > 0) {
      options.options.push(
        new SelectAmount(`Sell how many titanium, for ${TITANIUM_RATE} M€ each?`, 'Sell titanium', 1, player.titanium)
          .andThen((amount) => {
            player.stock.deduct(Resource.TITANIUM, amount, {log: true});
            player.stock.add(Resource.MEGACREDITS, amount * TITANIUM_RATE, {log: true});
            this.continueExchange(player);
            return undefined;
          }));
    }
    if (player.megaCredits >= STEEL_RATE) {
      options.options.push(
        new SelectAmount(`Buy how many steel, for ${STEEL_RATE} M€ each?`, 'Buy steel', 1, Math.floor(player.megaCredits / STEEL_RATE))
          .andThen((amount) => {
            player.stock.deduct(Resource.MEGACREDITS, amount * STEEL_RATE, {log: true});
            player.stock.add(Resource.STEEL, amount, {log: true});
            this.continueExchange(player);
            return undefined;
          }));
    }
    if (player.megaCredits >= TITANIUM_RATE) {
      options.options.push(
        new SelectAmount(`Buy how many titanium, for ${TITANIUM_RATE} M€ each?`, 'Buy titanium', 1, Math.floor(player.megaCredits / TITANIUM_RATE))
          .andThen((amount) => {
            player.stock.deduct(Resource.MEGACREDITS, amount * TITANIUM_RATE, {log: true});
            player.stock.add(Resource.TITANIUM, amount, {log: true});
            this.continueExchange(player);
            return undefined;
          }));
    }

    if (options.options.length === 0) {
      return undefined;
    }

    options.options.push(new SelectOption('Finish exchanging', 'Finish').andThen(() => undefined));
    return options;
  }

  private continueExchange(player: IPlayer): void {
    const next = this.offerExchange(player);
    if (next !== undefined) {
      player.defer(next);
    }
  }
}
