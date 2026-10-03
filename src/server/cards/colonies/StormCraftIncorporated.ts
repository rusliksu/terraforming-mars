import {ActiveCorporationCard} from '../corporation/CorporationCard';
import {IPlayer} from '../../IPlayer';
import {Tag} from '../../../common/cards/Tag';
import {CardResource} from '../../../common/CardResource';
import {AndOptions} from '../../inputs/AndOptions';
import {SelectAmount} from '../../inputs/SelectAmount';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {PlayerInput} from '../../PlayerInput';
import {Resource} from '../../../common/Resource';
import {message} from '../../logs/MessageBuilder';

export class StormCraftIncorporated extends ActiveCorporationCard {
  constructor() {
    super({
      name: CardName.STORMCRAFT_INCORPORATED,
      tags: [Tag.JOVIAN],
      startingMegaCredits: 48,
      resourceType: CardResource.FLOATER,

      action: {
        addResourcesToAnyCard: {type: CardResource.FLOATER, count: 1, autoSelect: true},
      },

      metadata: {
        cardNumber: 'R29',
        description: 'You start with 48 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br;
          b.megacredits(48);
          b.corpBox('action', (ce) => {
            ce.vSpace(Size.LARGE);
            ce.br;
            ce.action('Add a floater to ANY card.', (eb) => {
              eb.empty().startAction.resource(CardResource.FLOATER).asterix();
            });
            ce.br;
            ce.vSpace();
            ce.br;
            ce.effect('Floaters on this card may be used as 2 heat each.', (eb) => {
              eb.startEffect.resource(CardResource.FLOATER).equals().heat(2);
            });
          });
        }),
      },
    });
  }

  public spendHeat(player: IPlayer, targetAmount: number,
    cb: () => (undefined | PlayerInput) = () => undefined, reservedFloaters: number = 0): AndOptions {
    let heatAmount: number;
    let floaterAmount: number;

    return new AndOptions(
      new SelectAmount('Heat', 'Spend heat', 0, Math.min(player.heat + (player.tableau.has(CardName.SISTEMAS_SEEBECK) ? player.energy : 0), targetAmount))
        .andThen((amount) => {
          heatAmount = amount;
          return undefined;
        }),
      new SelectAmount('Stormcraft Incorporated Floaters (2 heat each)', 'Spend floaters',
        0, Math.min(this.resourceCount - reservedFloaters, Math.ceil(targetAmount / 2)))
        .andThen((amount) => {
          floaterAmount = amount;
          return undefined;
        })).andThen(() => {
      if (heatAmount + (floaterAmount * 2) < targetAmount) {
        throw new Error(`Need to pay ${targetAmount} heat`);
      }
      if (heatAmount > 0 && heatAmount - 1 + (floaterAmount * 2) >= targetAmount) {
        throw new Error('You cannot overspend heat');
      }
      if (floaterAmount > 0 && heatAmount + ((floaterAmount - 1) * 2) >= targetAmount) {
        throw new Error('You cannot overspend floaters');
      }
      const availableHeat = player.heat + (player.tableau.has(CardName.SISTEMAS_SEEBECK) ? player.energy : 0);
      if (this.resourceCount - reservedFloaters < floaterAmount || availableHeat < heatAmount) {
        throw new Error('Payment resources are no longer available');
      }
      player.removeResourceFrom(this, floaterAmount);
      const fromHeat = Math.min(player.heat, heatAmount);
      player.stock.deduct(Resource.HEAT, fromHeat);
      player.stock.deduct(Resource.ENERGY, heatAmount - fromHeat);
      return cb();
    }).setTitle(message('Select how to spend ${0} heat', (b) => b.number(targetAmount)));
  }
}
