import * as constants from '../../common/constants';
import {ICard} from '../cards/ICard';
import {GlobalParameter} from '../../common/GlobalParameter';
import {SelectOption} from '../inputs/SelectOption';
import {IPlayer} from '../IPlayer';
import {PlayerInput} from '../PlayerInput';
import {Resource} from '../../common/Resource';
import {SpaceType} from '../../common/boards/SpaceType';
import {GREENS_POLICY_2, GREENS_POLICY_3} from './parties/Greens';
import {GREENS_MORE_PARTIES_POLICY_2, GREENS_MORE_PARTIES_POLICY_3} from './parties/GreensMoreParties';
import {KELVINISTS_POLICY_3, KELVINISTS_POLICY_4} from './parties/Kelvinists';
import {MARS_FIRST_POLICY_2} from './parties/MarsFirst';
import {MARS_FIRST_MORE_PARTIES_POLICY_3} from './parties/MarsFirstMoreParties';
import {PartyHooks} from './parties/PartyHooks';
import {PartyName} from '../../common/turmoil/PartyName';
import {REDS_POLICY_2} from './parties/Reds';
import {REDS_MORE_PARTIES_POLICY_3} from './parties/RedsMoreParties';
import {MoonExpansion} from '../moon/MoonExpansion';
import {TRSource} from '../../common/cards/TRSource';
import {IPolicy, policyDescription} from './Policy';
import {message} from '../logs/MessageBuilder';
import {agendaInfoById} from '@/common/turmoil/Types';
import {ParameterBonus, ParameterTrack} from '../../common/GlobalParameterConfig';
import {MARS_GLOBAL_PARAMETERS} from './parties/ScientistsMoreParties';
import {DiscardCards} from '../deferredActions/DiscardCards';
import {POPULISTS_POLICY_1, POPULISTS_POLICY_3} from './parties/Populists';
import {CENTRISTS_POLICY_3} from './parties/Centrists';
import {BUREAUCRATS_POLICY_2, BUREAUCRATS_POLICY_4} from './parties/Bureaucrats';

/** The value at which a track first grants a bonus of the given kind, or Infinity if never. */
function bonusThreshold(track: ParameterTrack, kind: ParameterBonus['kind']): number {
  const bonus = track.bonuses.find((b) => b.kind === kind);
  return bonus === undefined ? Infinity : bonus.value;
}

export class TurmoilHandler {
  private constructor() {}

  public static partyAction(player: IPlayer): PlayerInput | undefined {
    const turmoil = player.game.turmoil;
    if (turmoil === undefined) {
      return undefined;
    }
    const policy: IPolicy = turmoil.rulingPolicy();
    // The vanilla Kelvinists kp03 is rendered in the Convert Heat slot by Player.getActions();
    // skip here to avoid double-rendering. Compared by object identity, not just id string --
    // a More Parties game's Kelvinists rework reuses the 'kp03' id for an unrelated policy that
    // should render normally through this generic path.
    if (policy === KELVINISTS_POLICY_3) {
      return undefined;
    }
    if (policy.canAct?.(player)) {
      const description = policyDescription(policy, player);
      const partyName = agendaInfoById(policy.id).name;
      const m = message('${0} (Turmoil ${1})', (b) => b.string(description).partyName(partyName));
      return new SelectOption(m, 'Pay').andThen(() => policy.action?.(player));
    }
    return undefined;
  }

  public static applyOnCardPlayedEffect(player: IPlayer, selectedCard: ICard): void {
    // PoliticalAgendas Greens P3 hook
    if (PartyHooks.shouldApplyPolicy(player, PartyName.GREENS, 'gp03')) {
      const policy = player.game.gameOptions.morePartiesExpansion ? GREENS_MORE_PARTIES_POLICY_3 : GREENS_POLICY_3;
      policy.onCardPlayed(player, selectedCard);
    }

    // PoliticalAgendas MarsFirst P2 hook (vanilla only -- More Parties reuses 'mp02' for an
    // unrelated action, see MarsFirstMoreParties)
    if (!player.game.gameOptions.morePartiesExpansion && PartyHooks.shouldApplyPolicy(player, PartyName.MARS, 'mp02')) {
      MARS_FIRST_POLICY_2.onCardPlayed(player, selectedCard);
    }

    // More Parties MarsFirst P3 hook (vanilla mp03 is an unrelated steel-value bonus, no
    // onCardPlayed of its own, but gate explicitly anyway for clarity/safety)
    if (player.game.gameOptions.morePartiesExpansion && PartyHooks.shouldApplyPolicy(player, PartyName.MARS, 'mp03')) {
      MARS_FIRST_MORE_PARTIES_POLICY_3.onCardPlayed(player, selectedCard);
    }

    // More Parties Populists P1 hook (double VP as M€ gain/loss)
    if (PartyHooks.shouldApplyPolicy(player, PartyName.POPULISTS, 'popp01')) {
      POPULISTS_POLICY_1.onCardPlayed(player, selectedCard);
    }

    // More Parties Populists P3 hook (draw on Event play)
    if (PartyHooks.shouldApplyPolicy(player, PartyName.POPULISTS, 'popp03')) {
      POPULISTS_POLICY_3.onCardPlayed(player, selectedCard);
    }

    // More Parties Centrists P3 hook (M€ on playing a card with a new tag)
    if (PartyHooks.shouldApplyPolicy(player, PartyName.CENTRISTS, 'cenp03')) {
      CENTRISTS_POLICY_3.onCardPlayed(player, selectedCard);
    }

    // More Parties Bureaucrats P4 hook (discard on card play, except the chairman)
    if (PartyHooks.shouldApplyPolicy(player, PartyName.BUREAUCRATS, 'burp04')) {
      BUREAUCRATS_POLICY_4.onCardPlayed(player, selectedCard);
    }
  }

  // More Parties Reds P2 hook (vanilla rp02 is an unrelated tile-placement cost)
  public static applyOnStandardProjectEffect(player: IPlayer): void {
    if (player.game.gameOptions.morePartiesExpansion && PartyHooks.shouldApplyPolicy(player, PartyName.REDS, 'rp02')) {
      player.game.defer(new DiscardCards(player, 1, 1, 'Select a card to discard (Turmoil Reds)'));
    }

    // More Parties Transhumanists P2 hook
    if (PartyHooks.shouldApplyPolicy(player, PartyName.TRANSHUMANISTS, 'trap02')) {
      player.stock.add(Resource.MEGACREDITS, 2, {log: true, from: {partyName: PartyName.TRANSHUMANISTS}});
    }
  }

  // More Parties Bureaucrats P3 hook -- called from Party.sendDelegate whenever a real player
  // (not a neutral delegate) places a delegate in any party.
  public static applyOnDelegatePlacedEffect(player: IPlayer): void {
    if (PartyHooks.shouldApplyPolicy(player, PartyName.BUREAUCRATS, 'burp03')) {
      player.stock.add(Resource.MEGACREDITS, 3, {log: true, from: {partyName: PartyName.BUREAUCRATS}});
    }
  }

  // More Parties Empower P2 hook -- called from Production.add whenever a player's energy
  // production changes, positive or negative.
  public static applyOnProductionChangedEffect(player: IPlayer, resource: Resource, amount: number): void {
    if (resource === Resource.ENERGY && amount !== 0 &&
        PartyHooks.shouldApplyPolicy(player, PartyName.EMPOWER, 'empp02')) {
      player.stock.add(Resource.ENERGY, 2, {log: true, from: {partyName: PartyName.EMPOWER}});
    }
  }

  // More Parties Spome P1 hook -- called from Game.addCity.
  public static applyOnCityTilePlacedEffect(player: IPlayer): void {
    if (PartyHooks.shouldApplyPolicy(player, PartyName.SPOME, 'spop01')) {
      player.drawCard(1);
    }
  }

  // More Parties Spome P2 hook -- called from MoonExpansion.addHabitatTile.
  public static applyOnHabitatTilePlacedEffect(player: IPlayer): void {
    if (PartyHooks.shouldApplyPolicy(player, PartyName.SPOME, 'spop02')) {
      player.stock.add(Resource.MEGACREDITS, 4, {log: true, from: {partyName: PartyName.SPOME}});
    }
  }

  // More Parties Bureaucrats P2 hook -- called from Game.startActionsForPlayer, once at the
  // start of each player's turn (not each action -- a turn is their full 1-2 action allotment).
  public static applyOnTurnStartEffect(player: IPlayer): void {
    if (PartyHooks.shouldApplyPolicy(player, PartyName.BUREAUCRATS, 'burp02')) {
      BUREAUCRATS_POLICY_2.onTurnStart?.(player);
    }
  }

  public static resolveTilePlacementCosts(player: IPlayer): void {
    // PoliticalAgendas Reds P2 hook (vanilla only -- More Parties reuses 'rp02' for an
    // unrelated standard-project effect, see RedsMoreParties/applyOnStandardProjectEffect)
    if (!player.game.gameOptions.morePartiesExpansion && PartyHooks.shouldApplyPolicy(player, PartyName.REDS, 'rp02')) {
      REDS_POLICY_2.onTilePlaced(player);
    }

    // More Parties Reds P3 hook (vanilla rp03 is an unrelated action, no onTilePlaced of its own,
    // but gate explicitly anyway for clarity/safety)
    if (player.game.gameOptions.morePartiesExpansion && PartyHooks.shouldApplyPolicy(player, PartyName.REDS, 'rp03')) {
      REDS_MORE_PARTIES_POLICY_3.onTilePlaced(player);
    }
  }

  public static resolveTilePlacementBonuses(player: IPlayer, spaceType: SpaceType): void {
    PartyHooks.applyMarsFirstRulingPolicy(player, spaceType);

    // PoliticalAgendas Greens P2 hook
    if (PartyHooks.shouldApplyPolicy(player, PartyName.GREENS, 'gp02')) {
      const policy = player.game.gameOptions.morePartiesExpansion ? GREENS_MORE_PARTIES_POLICY_2 : GREENS_POLICY_2;
      policy.onTilePlaced(player);
    }

    // PoliticalAgendas Kelvinists P4 hook
    if (PartyHooks.shouldApplyPolicy(player, PartyName.KELVINISTS, 'kp04')) {
      KELVINISTS_POLICY_4.onTilePlaced(player);
    }
  }

  public static onGlobalParameterIncrease(player: IPlayer, parameter: GlobalParameter, steps: number = 1): void {
    if (parameter === GlobalParameter.TEMPERATURE) {
      // PoliticalAgendas Kelvinists P2 hook (vanilla) / More Parties Kelvinists P1 hook (rework,
      // same effect but moved to a different policy slot)
      const policyId = player.game.gameOptions.morePartiesExpansion ? 'kp01' : 'kp02';
      if (PartyHooks.shouldApplyPolicy(player, PartyName.KELVINISTS, policyId)) {
        player.stock.add(Resource.MEGACREDITS, steps * 3);
        player.game.log('${0} gained ${1} M€ from Turmoil ${2} policy', (b) =>
          b.player(player).number(steps * 3).partyName(PartyName.KELVINISTS));
      }
    }

    // PoliticalAgendas Reds P4 hook (vanilla: any parameter)
    if (!player.game.gameOptions.morePartiesExpansion && PartyHooks.shouldApplyPolicy(player, PartyName.REDS, 'rp04')) {
      player.production.add(Resource.MEGACREDITS, -1 * steps, {log: true});
    }

    // More Parties Reds P4 hook: Mars parameters only
    if (player.game.gameOptions.morePartiesExpansion &&
        MARS_GLOBAL_PARAMETERS.includes(parameter) &&
        PartyHooks.shouldApplyPolicy(player, PartyName.REDS, 'rp04')) {
      player.production.add(Resource.MEGACREDITS, -1 * steps, {log: true});
    }

    // PoliticalAgendas Scientists P3 hook (vanilla: any parameter, draw only)
    if (!player.game.gameOptions.morePartiesExpansion && PartyHooks.shouldApplyPolicy(player, PartyName.SCIENTISTS, 'sp03')) {
      player.drawCard(steps);
    }

    // More Parties Scientists P3 hook: Mars parameters only, draw then discard per step
    if (player.game.gameOptions.morePartiesExpansion &&
        MARS_GLOBAL_PARAMETERS.includes(parameter) &&
        PartyHooks.shouldApplyPolicy(player, PartyName.SCIENTISTS, 'sp03')) {
      player.drawCard(steps);
      player.game.defer(new DiscardCards(player, steps, steps, 'Select cards to discard (Turmoil Scientists)'));
    }
  }

  public static computeTerraformRatingBump(player: IPlayer, tr: TRSource = {}): number {
    if (!PartyHooks.reds01PolicyInEffect(player)) {
      return 0;
    }

    // Making a local copy since it's going to get mutated.
    tr = {...tr};

    let total = 0;

    const parameters = player.game.parameters;

    if (tr.oxygen !== undefined) {
      const availableSteps = parameters.oxygen.max - player.game.getOxygenLevel();
      const steps = Math.min(availableSteps, tr.oxygen);
      total = total + steps;
      const chainToTemperature = bonusThreshold(parameters.oxygen, 'temperature');
      if (player.game.getOxygenLevel() < chainToTemperature &&
          player.game.getOxygenLevel() + steps >= chainToTemperature) {
        tr.temperature = (tr.temperature ?? 0) + 1;
      }
    }

    if (tr.temperature !== undefined) {
      const availableSteps = Math.floor((parameters.temperature.max - player.game.getTemperature()) / 2);
      const steps = Math.min(availableSteps, tr.temperature);
      total = total + steps;
      const chainToOcean = bonusThreshold(parameters.temperature, 'ocean');
      if (player.game.getTemperature() < chainToOcean &&
        player.game.getTemperature() + (steps * 2) >= chainToOcean) {
        tr.oceans = (tr.oceans ?? 0) + 1;
      }
    }

    if (tr.oceans !== undefined) {
      const availableSteps = parameters.oceans.max - player.game.board.getOceanSpaces().length;
      const steps = Math.min(availableSteps, tr.oceans);
      total = total + steps;
    }

    if (tr.venus !== undefined) {
      const availableSteps = Math.floor((parameters.venus.max - player.game.getVenusScaleLevel()) / parameters.venus.step);
      const steps = Math.min(availableSteps, tr.venus);
      total = total + steps;
      const chainToTr = bonusThreshold(parameters.venus, 'tr');
      if (player.game.getVenusScaleLevel() < chainToTr &&
        player.game.getVenusScaleLevel() + (steps * parameters.venus.step) >= chainToTr) {
        tr.tr = (tr.tr ?? 0) + 1;
      }
    }

    MoonExpansion.ifMoon(player.game, (moonData) => {
      if (tr.moonHabitat !== undefined) {
        const availableSteps = constants.MAXIMUM_HABITAT_RATE - moonData.habitatRate;
        total = total + Math.min(availableSteps, tr.moonHabitat);
      }

      if (tr.moonMining !== undefined) {
        const availableSteps = constants.MAXIMUM_MINING_RATE - moonData.miningRate;
        total = total + Math.min(availableSteps, tr.moonMining);
      }

      if (tr.moonLogistic !== undefined) {
        const availableSteps = constants.MAXIMUM_LOGISTIC_RATE - moonData.logisticRate;
        total = total + Math.min(availableSteps, tr.moonLogistic);
      }
    });

    total += tr.tr ?? 0;

    if (player.preservationProgram === true) {
      total = Math.max(total - 1, 0);
    }

    return total;
  }
}
