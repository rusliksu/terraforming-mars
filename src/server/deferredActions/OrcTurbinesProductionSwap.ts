import {DeferredAction} from './DeferredAction';
import {IPlayer} from '../IPlayer';
import {Priority} from './Priority';
import {Resource} from '../../common/Resource';
import {OrOptions} from '../inputs/OrOptions';
import {SelectOption} from '../inputs/SelectOption';
import {message} from '../logs/MessageBuilder';
import {From} from '../logs/From';

/** Orc Turbines (Rob Antilles): "every time you decrease your Energy production, you can
 * decrease your Heat production by 2 instead." A passive substitution offered every time
 * something would reduce this player's own Energy production, regardless of the source. */
export class OrcTurbinesProductionSwap extends DeferredAction {
  constructor(
    player: IPlayer,
    private amount: number,
    private options?: {log: boolean, from?: From, stealing?: boolean},
  ) {
    super(player, Priority.DEFAULT);
  }

  public execute() {
    const player = this.player;
    const heatLoss = this.amount * 2;

    // Heat production floors at 0. If there isn't room to take the full swap out of heat,
    // just apply the energy loss as normal rather than offering a choice that can't be honored.
    if (player.production.heat < heatLoss) {
      player.production.add(Resource.ENERGY, -this.amount, {...this.options, log: true, skipOrcTurbinesSwap: true});
      return undefined;
    }

    return new OrOptions(
      new SelectOption(message('Decrease your Energy production by ${0} normally', (b) => b.number(this.amount)))
        .andThen(() => {
          player.production.add(Resource.ENERGY, -this.amount, {...this.options, log: true, skipOrcTurbinesSwap: true});
          return undefined;
        }),
      new SelectOption(message('Orc Turbines: decrease your Heat production by ${0} instead', (b) => b.number(heatLoss)))
        .andThen(() => {
          player.production.add(Resource.HEAT, -heatLoss, {...this.options, log: true, skipOrcTurbinesSwap: true});
          return undefined;
        }),
    ).setTitle(message('${0} production would be reduced by ${1}', (b) => b.string(Resource.ENERGY).number(this.amount)));
  }
}
