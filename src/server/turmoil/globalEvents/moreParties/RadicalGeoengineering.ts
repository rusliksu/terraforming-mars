import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IGame} from '../../../IGame';
import {IPlayer} from '../../../IPlayer';
import {PlayerInput} from '../../../PlayerInput';
import {Resource} from '../../../../common/Resource';
import {GlobalParameter} from '../../../../common/GlobalParameter';
import {Turmoil} from '../../Turmoil';
import {OrOptions} from '../../../inputs/OrOptions';
import {SelectOption} from '../../../inputs/SelectOption';
import {SimpleDeferredAction} from '../../../deferredActions/DeferredAction';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';
import {digit} from '../../../cards/Options';

export class RadicalGeoengineering extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.RADICAL_GEOENGINEERING,
      description: 'The first player raises one global parameter one step, then lowers a ' +
        'different global parameter one step. Each player loses 1 steel for every 5 TR over ' +
        '15 (max 5), reduced by influence.',
      revealedDelegate: PartyName.EMPOWER,
      currentDelegate: PartyName.CENTRISTS,
      renderData: CardRenderer.builder((b) => {
        b.plus(Size.SMALL).minus(Size.SMALL).asterix(Size.SMALL).br;
        b.minus(Size.SMALL).steel(1, {size: Size.SMALL}).slash(Size.SMALL).tr(5, {size: Size.SMALL, digit}).influence({size: Size.SMALL});
      }),
    });
  }

  // "The first player" -- same player targeted by the declarative `behavior.once` field
  // elsewhere in this file (see GlobalEvent.resolve, which runs `once` behaviors against
  // `game.playersInGenerationOrder[0]`). This effect needs a genuine player choice of *which*
  // parameter to raise and which (different) one to lower, so it's implemented as a bespoke
  // deferred OrOptions chain instead of the declarative `global` behavior (which only supports
  // fixed values, not a choice).
  public override bespokeResolve(game: IGame) {
    const firstPlayer = game.playersInGenerationOrder[0];
    game.defer(new SimpleDeferredAction(firstPlayer, () => this.selectIncrease(game, firstPlayer)));
  }

  // "5 TR over 15 (max 5) reduced by influence" -- no Countable field exists for counting a
  // player's current TR with an offset, so this is computed by hand, following the same
  // order Countable.ts documents for its `turmoil.max`/`turmoil.influence` fields: cap the
  // raw count first, then subtract influence, then floor the result at zero (mirroring how
  // the declarative `lose` behavior treats a negative count as zero).
  public override bespokeResolvePlayer(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const excessTR = Math.max(0, player.terraformRating - 15);
    const rawCount = Math.min(5, Math.floor(excessTR / 5));
    const amount = Math.max(0, rawCount - turmoil.getInfluence(player));
    if (amount > 0) {
      player.stock.deduct(Resource.STEEL, amount, {log: true, from: {globalEvent: this}});
    }
  }

  private selectIncrease(game: IGame, player: IPlayer): PlayerInput | undefined {
    const options: Array<SelectOption> = [];
    const params = game.parameters;

    if (game.getTemperature() < params.temperature.max) {
      options.push(new SelectOption('Raise the temperature 1 step').andThen(() => {
        game.increaseTemperature(player, 1);
        game.defer(new SimpleDeferredAction(
          player, () => this.selectDecrease(game, player, GlobalParameter.TEMPERATURE)));
        return undefined;
      }));
    }
    if (game.getOxygenLevel() < params.oxygen.max) {
      options.push(new SelectOption('Raise the oxygen level 1 step').andThen(() => {
        game.increaseOxygenLevel(player, 1);
        game.defer(new SimpleDeferredAction(
          player, () => this.selectDecrease(game, player, GlobalParameter.OXYGEN)));
        return undefined;
      }));
    }
    if (game.gameOptions.venusNextExtension && game.getVenusScaleLevel() < params.venus.max) {
      options.push(new SelectOption('Raise the Venus scale 1 step').andThen(() => {
        game.increaseVenusScaleLevel(player, 1);
        game.defer(new SimpleDeferredAction(
          player, () => this.selectDecrease(game, player, GlobalParameter.VENUS)));
        return undefined;
      }));
    }

    return new OrOptions(...options).setTitle('Select a global parameter to raise').reduce();
  }

  private selectDecrease(game: IGame, player: IPlayer, excluding: GlobalParameter): PlayerInput | undefined {
    const options: Array<SelectOption> = [];
    const params = game.parameters;

    if (excluding !== GlobalParameter.TEMPERATURE && game.getTemperature() > params.temperature.min) {
      options.push(new SelectOption('Lower the temperature 1 step').andThen(() => {
        game.increaseTemperature(player, -1);
        return undefined;
      }));
    }
    if (excluding !== GlobalParameter.OXYGEN && game.getOxygenLevel() > params.oxygen.min) {
      options.push(new SelectOption('Lower the oxygen level 1 step').andThen(() => {
        game.increaseOxygenLevel(player, -1);
        return undefined;
      }));
    }
    if (excluding !== GlobalParameter.VENUS && game.gameOptions.venusNextExtension &&
        game.getVenusScaleLevel() > params.venus.min) {
      options.push(new SelectOption('Lower the Venus scale 1 step').andThen(() => {
        game.increaseVenusScaleLevel(player, -1);
        return undefined;
      }));
    }

    return new OrOptions(...options).setTitle('Select a global parameter to lower').reduce();
  }
}
