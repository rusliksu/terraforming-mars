import {serializeDynamicCards, restoreDynamicCards} from './cards/DynamicCardState';
import {getAutomationCompatibility} from './bot/AutomationCompatibility';
import {isLastActivePlayerFinish} from '../common/game/CompletionOutcome';
import {sendTurnNotice, deleteTurnNotice, deleteTurnNoticeMessage, getStoredTurnNoticeUpdatedAt} from './TelegramBot';
import * as constants from '../common/constants';
import {PlayerId} from '../common/Types';
import {MILESTONE_COST, REDS_RULING_POLICY_COST} from '../common/constants';
import {cardsFromJSON, ceosFromJSON, corporationCardsFromJSON, newCorporationCard, newProjectCard, preludesFromJSON} from './createCard';
import {CardName} from '../common/cards/CardName';
import {CardType} from '../common/cards/CardType';
import {Color, normalizePlayerNameForColor} from '../common/Color';
import {ICorporationCard} from './cards/corporation/ICorporationCard';
import {IGame} from './IGame';
import {Game} from './Game';
import {Payment, PaymentOptions, DEFAULT_PAYMENT_VALUES, paymentTotal} from '../common/inputs/Payment';
import {SpendableResource, SPENDABLE_RESOURCES, SpendableCardResource, CARD_FOR_SPENDABLE_RESOURCE} from '../common/inputs/Spendable';
import {toLogPayment} from './logs/toLogPayment';
import {IAward} from './awards/IAward';
import {ICard, isIActionCard, IActionCard} from './cards/ICard';
import {IMilestone} from './milestones/IMilestone';
import {IProjectCard} from './cards/IProjectCard';
import {OrOptions} from './inputs/OrOptions';
import {PartyHooks} from './turmoil/parties/PartyHooks';
import {PartyName} from '../common/turmoil/PartyName';
import {Phase} from '../common/Phase';
import {PlayerInput} from './PlayerInput';
import {Resource} from '../common/Resource';
import {CardResource} from '../common/CardResource';
import {SelectCard} from './inputs/SelectCard';
import {SellPatentsStandardProject} from './cards/base/standardProjects/SellPatentsStandardProject';
import {SimpleDeferredAction} from './deferredActions/DeferredAction';
import {Priority} from './deferredActions/Priority';
import {SelectPaymentDeferred} from './deferredActions/SelectPaymentDeferred';
import {SelectProjectCardToPlay} from './inputs/SelectProjectCardToPlay';
import {SelectOption} from './inputs/SelectOption';
import {SelectSpace} from './inputs/SelectSpace';
import {SelfReplicatingRobots} from './cards/promo/SelfReplicatingRobots';
import {SerializedPlayer} from './SerializedPlayer';
import {StormCraftIncorporated} from './cards/colonies/StormCraftIncorporated';
import {Tag} from '../common/cards/Tag';
import {Timer} from '../common/Timer';
import {TurmoilHandler} from './turmoil/TurmoilHandler';
import {AllOptions, DrawCards, DrawOptions} from './deferredActions/DrawCards';
import {Units} from '../common/Units';
import {MoonExpansion} from './moon/MoonExpansion';
import {IStandardProjectCard} from './cards/IStandardProjectCard';
import {ConvertPlants} from './cards/base/standardActions/ConvertPlants';
import {ConvertHeat} from './cards/base/standardActions/ConvertHeat';
import {KELVINISTS_POLICY_3} from './turmoil/parties/Kelvinists';
import {SistemasSeebeck} from './cards/pathfinders/SistemasSeebeck';
import {GlobalParameter} from '../common/GlobalParameter';
import {LogHelper} from './LogHelper';
import {UndoActionOption} from './inputs/UndoActionOption';
import {Turmoil} from './turmoil/Turmoil';
import {PathfindersExpansion} from './pathfinders/PathfindersExpansion';
import {ColoniesHandler} from './colonies/ColoniesHandler';
import {MonsInsurance} from './cards/promo/MonsInsurance';
import {InputResponse} from '../common/inputs/InputResponse';
import {Tags} from './player/Tags';
import {Colonies} from './player/Colonies';
import {Production} from './player/Production';
import {Stock} from './player/Stock';
import {getBehaviorExecutor} from './behavior/BehaviorExecutor';
import {CeoExtension} from './CeoExtension';
import {ICeoCard, isCeoCard} from './cards/ceos/ICeoCard';
import {message} from './logs/MessageBuilder';
import {calculateVictoryPoints} from './game/calculateVictoryPoints';
import {VictoryPointsBreakdown} from '../common/game/VictoryPointsBreakdown';
import {Supercapacitors} from './cards/promo/Supercapacitors';
import {deferEnergyKeep, getEnergyKeepCap} from './cards/robantilles/RobAntillesEnergyKeep';
import {CanAffordOptions, CardAction, IPlayer} from './IPlayer';
import {IPreludeCard} from './cards/prelude/IPreludeCard';
import {copyAndClear, inplaceRemove, sum, toName} from '../common/utils/utils';
import {PreludesExpansion} from './preludes/PreludesExpansion';
import {ChooseCards} from './deferredActions/ChooseCards';
import {UnderworldPlayerData} from '../common/underworld/UnderworldPlayerData';
import {DeltaProjectPlayerModel} from '../common/models/DeltaProjectPlayerModel';
import {UnderworldExpansion} from './underworld/UnderworldExpansion';
import {ConglomeratesPlayerData, TeamActionCosts} from '../common/conglomerates/ConglomeratesPlayerData';
import {ConglomeratesExpansion} from './conglomerates/ConglomeratesExpansion';
import {Counter} from './behavior/Counter';
import {TRSource} from '../common/cards/TRSource';
import {IParty} from './turmoil/parties/IParty';
import {newStandardDraft} from './Draft';
import {Message} from '../common/logs/Message';
import {DiscordId} from './server/auth/discord';
import {AlliedParty} from '../common/turmoil/Types';
import {PlayedCards} from './cards/PlayedCards';
import {From} from './logs/From';
import {SelectStandardProjectToPlay} from './inputs/SelectStandardProjectToPlay';
import {EarlyGameStats} from './game/EarlyGameStats';
import {DEFAULT_PRELUDE_HANDICAP, normalizePreludeHandicap} from '../common/game/NewGameConfig';
import type {ResearchPurchaseUndoState} from './game/ResearchPurchaseUndo';
import {SURRENDER_ACTION_ANNOTATION, SURRENDER_CONFIRMATION_ANNOTATION} from './surrender/SurrenderInput';
import {SelectAmount} from './inputs/SelectAmount';
import {RemoveResourcesFromCard} from './deferredActions/RemoveResourcesFromCard';

const THROW_STATE_ERRORS = Boolean(process.env.THROW_STATE_ERRORS);
const TURN_NOTICE_DELAY_MS = 5000;
const DEFAULT_TURN_NOTICE_REMINDER_MS = 12 * 60 * 60 * 1000;
const DEFAULT_GLOBAL_PARAMETER_STEPS = {
  [GlobalParameter.OCEANS]: 0,
  [GlobalParameter.OXYGEN]: 0,
  [GlobalParameter.TEMPERATURE]: 0,
  [GlobalParameter.VENUS]: 0,
  [GlobalParameter.MOON_HABITAT_RATE]: 0,
  [GlobalParameter.MOON_MINING_RATE]: 0,
  [GlobalParameter.MOON_LOGISTIC_RATE]: 0,
} as const;

function getTurnNoticeReminderMs(): number {
  const raw = process.env.TM_TURN_NOTICE_REMINDER_MS;
  if (raw === undefined) {
    return DEFAULT_TURN_NOTICE_REMINDER_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_TURN_NOTICE_REMINDER_MS;
  }
  return parsed;
}

function unrefTimer(timer: ReturnType<typeof setTimeout>): void {
  timer.unref?.();
}

export class Player implements IPlayer {
  public readonly id: PlayerId;
  protected waitingFor?: PlayerInput;
  protected waitingForCb?: () => void;
  public game: IGame;
  public tags: Tags;
  public colonies: Colonies;
  public readonly production: Production;
  public readonly stock: Stock;
  public readonly opponents: ReadonlyArray<IPlayer> = [];
  private _alliedParty: AlliedParty | undefined;

  // Used only during set-up
  public pickedCorporationCard?: ICorporationCard;

  // Terraforming Rating
  public terraformRating: number = 20;
  public hasIncreasedTerraformRatingThisGeneration: boolean = false;


  // Resource values
  private titaniumValue: number = 3;
  private steelValue: number = 2;
  // Venus Phase 2's Negative Mass Fluids
  private floaterValue: number = constants.FLOATERS_VALUE;
  // Helion
  public canUseHeatAsMegaCredits: boolean = false;
  // Turmoil More Parties: Empower Policy 1, only while that policy is in effect.
  public canUseEnergyAsMegaCredits: boolean = false;
  // Sistemas Seebeck (fan): see IPlayer.skipNextActionIncrement.
  public skipNextActionIncrement: boolean = false;
  // Martian Lumber Corp
  public canUsePlantsAsMegacredits: boolean = false;
  // Luna Trade Federation
  public canUseTitaniumAsMegacredits: boolean = false;

  // This generation / this round
  public actionsTakenThisRound: number = 0;
  public actionsThisGeneration: Set<CardName> = new Set();
  public lastCardPlayed: CardName | undefined;
  /** Set whenever this player places a greenery tile; equals `actionsTakenThisGame` exactly when that placement was this player's most recent action. */
  public lastGreeneryActionNumber: number | undefined;
  /** When set, caps how many cards can be kept (bought) in this player's next research phase, then clears. */
  public nextResearchKeepMax: number | undefined;
  public pendingInitialActions: Array<ICorporationCard> = [];

  // Cards
  public dealtCorporationCards: Array<ICorporationCard> = [];
  public dealtPreludeCards: Array<IPreludeCard> = [];
  public dealtCeoCards: Array<ICeoCard> = [];
  public dealtProjectCards: Array<IProjectCard> = [];
  public cardsInHand: Array<IProjectCard> = [];
  public preludeCardsInHand: Array<IPreludeCard> = [];
  public ceoCardsInHand: Set<ICeoCard> = new Set();
  public playedCards: PlayedCards = new PlayedCards();
  public draftedCards: Array<IProjectCard> = [];
  public researchPurchaseUndo: ResearchPurchaseUndoState | undefined;
  public draftHand: Array<IProjectCard> = [];
  public cardCost: number = constants.CARD_COST;
  public needsToDraft?: boolean;

  public timer: Timer = Timer.newInstance();
  public autopass = false;

  // Turmoil
  public turmoilPolicyActionUsed: boolean = false;
  public politicalAgendasActionUsedCount: number = 0;

  public oceanBonus: number = constants.OCEAN_BONUS;

  // Custom cards
  // PoliticalAgendas Scientists P41
  public hasTurmoilScienceTagBonus: boolean = false;
  // Ecoline
  public plantsNeededForGreenery: number = 8;
  // Lawsuit
  public removingPlayers: Array<PlayerId> = [];
  // Warmonger
  public warmongerCards: number = 0;
  // Industries (fan expansion)
  public industryTilesPlaced: number = 0;
  // For Playwrights corp.
  // removedFromPlayCards is a bit of a misname: it's a temporary storage for
  // cards that provide 'next card' discounts. This will clear between turns.
  public removedFromPlayCards: Array<IProjectCard> = [];
  public preservationProgram = false;
  public trThisGeneration = 0;
  // Administrative Delay (idesOfMars, fan): when set to the current generation, this player
  // may end their turn having taken 0 actions this round without it counting as passing.
  public administrativeDelayActiveGeneration: number | undefined = undefined;
  // Management Crisis (Solaris, fan): when set to the current generation, this player is
  // capped at 1 action per turn (instead of the normal 2) for the rest of the generation.
  // Same "compare to current generation" pattern as administrativeDelayActiveGeneration above,
  // so it self-clears once the generation moves on, with no explicit reset needed.
  public oneActionPerTurnActiveGeneration: number | undefined = undefined;
  public underworldData: UnderworldPlayerData = UnderworldExpansion.initializePlayer();
  public conglomeratesData: ConglomeratesPlayerData = ConglomeratesExpansion.initializePlayer();
  public deltaProjectData?: DeltaProjectPlayerModel;
  public epsilonDampleData?: DeltaProjectPlayerModel;
  public standardProjectsThisGeneration: Set<CardName> = new Set();
  public temporaryGlobalParameterRequirementBonus = 0;

  // The number of actions a player can take this round.
  // It's almost always 2, but certain cards can change this value (Mars Maths, Tool with the First Order)
  public availableActionsThisRound = 2;

  public withinDeflectionZone = false;

  // Stats
  public actionsTakenThisGame: number = 0;
  /** Snapshot of `actionsTakenThisGame` at the start of the current generation (see Game.startGeneration). Equal to `actionsTakenThisGame` exactly when the player hasn't taken an action yet this generation. */
  public actionsTakenAtGenerationStart: number = 0;
  public victoryPointsByGeneration: Array<number> = [];
  public totalDelegatesPlaced: number = 0;
  public earlyGameStats: EarlyGameStats = {version: 1};
  public globalParameterSteps: Record<GlobalParameter, number> = {...DEFAULT_GLOBAL_PARAMETER_STEPS};

  public user?: DiscordId;
  public telegramID: string = '';
  public lastNoticeMessageId: number = -1;
  public lastTurnNoticeKey: string = '';
  public lastTurnReminderNoticeKey: string = '';
  private _pendingTurnNoticeTimer?: ReturnType<typeof setTimeout>;
  private _pendingTurnNoticeReminderTimer?: ReturnType<typeof setTimeout>;
  private _pendingTurnNoticeReminderKey?: string;
  private _turnNoticeSentThisRound: boolean = false;

  public get megaCredits(): number {
    return this.stock.megacredits;
  }

  public get steel(): number {
    return this.stock.steel;
  }

  public get titanium(): number {
    return this.stock.titanium;
  }

  public get plants(): number {
    return this.stock.plants;
  }

  public get energy(): number {
    return this.stock.energy;
  }
  public get heat(): number {
    return this.stock.heat;
  }

  public get alliedParty(): AlliedParty | undefined {
    return this._alliedParty;
  }

  public set megaCredits(megacredits: number) {
    this.stock.megacredits = megacredits;
  }

  public set steel(steel: number) {
    this.stock.steel = steel;
  }

  public set titanium(titanium: number) {
    this.stock.titanium = titanium;
  }

  public set plants(plants: number) {
    this.stock.plants = plants;
  }

  public set energy(energy: number) {
    this.stock.energy = energy;
  }

  public set heat(heat: number) {
    this.stock.heat = heat;
  }

  public setAlliedParty(p: IParty) {
    this._alliedParty = {
      partyName: p.name,
      agenda: {
        bonusId: p.bonuses[0].id,
        policyId: p.policies[0].id,
      },
    };
    const alliedPolicy = this.game.turmoil?.getPartyByName(p.name).policies.find((t) => t.id === p.policies[0].id);

    alliedPolicy?.onPolicyStartForPlayer?.(this);
  }

  constructor(
    public name: string,
    public color: Color,
    public beginner: boolean,
    public handicap: number = 0,
    id: PlayerId,
    public preludeHandicap: number = DEFAULT_PRELUDE_HANDICAP) {
    this.id = id;
    this.name = normalizePlayerNameForColor(this.color, this.name);
    this.preludeHandicap = normalizePreludeHandicap(this.preludeHandicap);
    // This seems pretty bad. The game will be set before the Player is actually
    // used, and if that doesn't happen, well, it's a worthy error.
    // The alterantive, to make game type Game | undefined, will cause compilation
    // issues throughout the app.
    // Ideally the right thing is to invert how players and games get created.
    // But one thing at a time.
    this.game = undefined as unknown as Game;
    this.tags = new Tags(this);
    this.colonies = new Colonies(this);
    this.production = new Production(this);
    this.stock = new Stock(this);
  }

  public setup(game: IGame) {
    this.game = game;
    (this.opponents as Array<IPlayer>).push(...game.players.filter((p) => p !== this));
  }

  public tearDown() {
    this.game = undefined as unknown as Game;
  }

  /**
   * @deprecated use |playedCards|.
   */
  public get tableau(): PlayedCards {
    return this.playedCards;
  }

  public getTitaniumValue(): number {
    return this.titaniumValue;
  }

  public increaseTitaniumValue(): void {
    this.titaniumValue++;
  }

  public decreaseTitaniumValue(): void {
    if (this.titaniumValue > 0) {
      this.titaniumValue--;
    }
  }

  public getSelfReplicatingRobotsTargetCards(): Array<IProjectCard> {
    const selfReplicatingRobots = this.tableau.get(CardName.SELF_REPLICATING_ROBOTS);
    if (selfReplicatingRobots instanceof SelfReplicatingRobots) {
      return selfReplicatingRobots.targetCards;
    }
    return [];
  }

  public getSteelValue(): number {
    return this.steelValue;
  }

  public increaseSteelValue(): void {
    this.steelValue++;
  }

  public decreaseSteelValue(): void {
    if (this.steelValue > 0) {
      this.steelValue--;
    }
  }

  public getFloaterValue(): number {
    return this.floaterValue;
  }

  public increaseFloaterValue(): void {
    this.floaterValue++;
  }

  public increaseTerraformRating(steps: number = 1, opts: {log?: boolean, from?: From} = {}) {
    const inActionPhase = this.game.phase === Phase.ACTION;
    const isFirstTrThisGeneration = this.trThisGeneration === 0;
    if (inActionPhase) {
      this.trThisGeneration += steps;
    }
    if (this.preservationProgram === true && inActionPhase && isFirstTrThisGeneration) {
      steps--;
      this.game.log('${0} for ${1} is blocking 1 TR', (b) => b.cardName(CardName.PRESERVATION_PROGRAM).player(this));
      this.preservationProgram = false;
      if (steps === 0) {
        return;
      }
    }
    const raiseRating = () => {
      this.terraformRating += steps;
      this.hasIncreasedTerraformRatingThisGeneration = true;

      if (opts.log === true) {
        if (opts.from !== undefined) {
          const from = opts.from;
          this.game.log('${0} gained ${1} TR from ${2}', (b) => b.player(this).number(steps).from(from),
            {effect: {kind: 'tr', amount: steps, player: this.color}});
        } else {
          this.game.log('${0} gained ${1} TR', (b) => b.player(this).number(steps),
            {effect: {kind: 'tr', amount: steps, player: this.color}});
        }
      }
      for (const cardOwner of this.game.playersInGenerationOrder) {
        for (const card of cardOwner.tableau) {
          card.onIncreaseTerraformRatingByAnyPlayer?.(cardOwner, this, steps);
        }
      }
    };

    if (PartyHooks.reds01PolicyInEffect(this)) {
      const redsCost = REDS_RULING_POLICY_COST * steps;
      if (!this.canAfford(redsCost)) {
        // Cannot pay Reds, will not increase TR
        return;
      }
      this.defer(() => {
        // Earlier queued payments may have consumed the available funds.
        if (!this.canAfford(redsCost)) {
          return undefined;
        }
        return new SelectPaymentDeferred(this, redsCost, {title: 'Select how to pay for TR increase'})
          .andThen((payment) => {
            // Report what the player actually paid, which can be resources instead of megacredits.
            this.game.log('${0} paid ${1} M€ for Turmoil ${2} policy', (b) =>
              b.player(this).number(paymentTotal(payment)).partyName(PartyName.REDS));
            raiseRating();
            return undefined;
          }).execute();
      }, Priority.COST);
    } else {
      raiseRating();
    }
  }

  public decreaseTerraformRating(steps: number = 1, opts: {log?: boolean} = {}) {
    this.terraformRating -= steps;
    if (opts.log === true) {
      this.game.log('${0} lost ${1} TR', (b) => b.player(this).number(steps),
        {effect: {kind: 'tr', amount: -steps, player: this.color}});
    }
  }

  public setTerraformRating(value: number) {
    return this.terraformRating = value;
  }

  public getVictoryPoints(): VictoryPointsBreakdown {
    return calculateVictoryPoints(this);
  }

  public plantsAreProtected(): boolean {
    return this.withinDeflectionZone ||
      this.playedCards.has(CardName.PROTECTED_HABITATS) ||
      this.playedCards.has(CardName.PROTECTED_HABITATS_BETTER_MARS) ||
      this.playedCards.has(CardName.ASTEROID_DEFLECTION_SYSTEM);
  }

  public alloysAreProtected(): boolean {
    return this.playedCards.has(CardName.LUNAR_SECURITY_STATIONS) ||
      this.playedCards.has(CardName.MARTIAN_ARMED_FORCES);
  }

  public megacreditsAreProtected(): boolean {
    return this.playedCards.has(CardName.MARTIAN_ARMED_FORCES);
  }

  public isProtected(resource: Resource) {
    switch (resource) {
    case Resource.PLANTS:
      return this.plantsAreProtected();
    case Resource.STEEL:
    case Resource.TITANIUM:
      return this.alloysAreProtected();
    case Resource.MEGACREDITS:
      return this.megacreditsAreProtected();
    }
    return false;
  }

  public canHaveProductionReduced(resource: Resource, minQuantity: number, attacker: IPlayer) {
    const reducable = this.production[resource] + (resource === Resource.MEGACREDITS ? 5 : 0);
    if (reducable < minQuantity) {
      return false;
    }

    if (resource === Resource.STEEL || resource === Resource.TITANIUM) {
      if (this.alloysAreProtected()) {
        return false;
      }
    }

    // The pathfindersExpansion test is just an optimization for non-Pathfinders games.
    if (attacker !== this && this.playedCards.has(CardName.PRIVATE_SECURITY)) {
      return false;
    }
    return true;
  }

  public maybeBlockAttack(perpetrator: IPlayer, msg: Message | string, cb: (proceed: boolean) => PlayerInput | undefined): void {
    this.defer(
      UnderworldExpansion.maybeBlockAttack(this, perpetrator, msg, cb),
      Priority.MAYBE_BLOCK_ATTACK);
  }

  public attack(perpetrator: IPlayer, resource: Resource, count: number, options?: {log?: boolean, stealing?: boolean}): void {
    if (count === 0) {
      return;
    }
    if (count < 0) {
      throw new Error('Unexpected attack count is less than 0 ' + count);
    }
    const msg = message('Lose ${0} ${1}', (b) => b.number(count).string(resource));
    this.maybeBlockAttack(perpetrator, msg, (proceed) => {
      if (proceed) {
        if (options?.stealing) {
          this.stock.steal(resource, count, perpetrator, {log: options?.log});
        } else {
          this.stock.deduct(resource, count, {log: options?.log, from: {player: perpetrator}});
        }
      }
      return undefined;
    });
  }

  public resolveInsurance() {
    const monsInsuranceOwner = this.game.monsInsuranceOwner;
    if (monsInsuranceOwner !== undefined && monsInsuranceOwner !== this) {
      const monsInsurance = <MonsInsurance>monsInsuranceOwner.tableau.get(CardName.MONS_INSURANCE);
      monsInsurance.payDebt(monsInsuranceOwner, this);
    }
  }

  public resolveInsuranceInSoloGame() {
    const monsInsurance = <MonsInsurance> this.tableau.get(CardName.MONS_INSURANCE);
    monsInsurance?.payDebt(this, undefined);
  }

  public getColoniesCount() {
    if (!this.game.gameOptions.coloniesExtension) {
      return 0;
    }

    let coloniesCount = 0;

    this.game.colonies.forEach((colony) => {
      coloniesCount += colony.colonies.filter((owner) => owner === this.id).length;
    });

    return coloniesCount;
  }

  /**
   * Return the number of events played by this player.
   *
   * When playing Pharmacy Union, if the card is discarded, then it sits in the event pile.
   * That's why it's included below. The FAQ describes how this applies to things like the
   * Legend Milestone, Media Archives, and NOT Media Group.
   */
  public getPlayedEventsCount(): number {
    let count = this.playedCards.eventCount;
    if (this.tableau.get(CardName.PHARMACY_UNION)?.isDisabled) {
      count++;
    }
    return count;
  }

  public getGlobalParameterRequirementBonus(parameter: GlobalParameter): number {
    let requirementsBonus = this.temporaryGlobalParameterRequirementBonus;
    for (const card of this.tableau) {
      requirementsBonus += card.getGlobalParameterRequirementBonus(this, parameter);
    }

    // PoliticalAgendas Scientists P2 hook
    if (PartyHooks.shouldApplyPolicy(this, PartyName.SCIENTISTS, 'sp02')) {
      requirementsBonus += 2;
    }

    requirementsBonus += UnderworldExpansion.getGlobalParameterRequirementBonus(this, parameter);

    return requirementsBonus;
  }

  public getTagCardRequirementBonus(tag: Tag): number {
    let requirementsBonus = 0;
    for (const card of this.tableau) {
      requirementsBonus += card.getTagCardRequirementBonus(this, tag);
    }
    return requirementsBonus;
  }

  public onGlobalParameterIncrease(parameter: GlobalParameter, steps: number): void {
    // Tracks this player's contributition to global parmeters for end-of-game reporting.
    this.globalParameterSteps[parameter] += steps;
  }

  public removeResourceFrom(card: ICard, count: number = 1, options?: {removingPlayer? : IPlayer, log?: boolean}): void {
    const removingPlayer = options?.removingPlayer;
    if (card.resourceCount) {
      const amountRemoved = Math.min(card.resourceCount, count);
      if (amountRemoved === 0) {
        return;
      }
      card.resourceCount -= amountRemoved;

      if (removingPlayer !== undefined && removingPlayer !== this) {
        this.resolveInsurance();
      }

      if (options?.log ?? true) {
        this.game.log('${0} removed ${1} resource(s) from ${2}\'s ${3}', (b) =>
          b.player(options?.removingPlayer ?? this)
            .number(amountRemoved)
            .player(this)
            .card(card));
      }

      // Lawsuit hook
      if (removingPlayer !== undefined && removingPlayer !== this && this.removingPlayers.includes(removingPlayer.id) === false) {
        this.removingPlayers.push(removingPlayer.id);
      }
      // Vermin hook (1 of 2)
      if (card.name === CardName.VERMIN) {
        this.game.verminInEffect = card.resourceCount >= 10;
      }
    }
  }

  public addResourceTo(card: ICard, options: number | {qty?: number, log: boolean, logZero?: boolean, from?: From} = 1): void {
    const count = typeof(options) === 'number' ? options : (options.qty ?? 1);

    if (card.resourceCount !== undefined) {
      card.resourceCount += count;
    }

    if (typeof(options) !== 'number' && options.log === true) {
      if (options.logZero === true || count !== 0) {
        LogHelper.logAddResource(this, card, count, options.from);
      }
    }

    if (count > 0) {
      for (const playedCard of this.tableau) {
        playedCard.onResourceAdded?.(this, card, count);
      }
      // `this.game` may not be wired up yet in a few test-only construction paths.
      if (this.game !== undefined) {
        for (const cardOwner of this.game.playersInGenerationOrder) {
          for (const playedCard of cardOwner.tableau) {
            playedCard.onResourceAddedByAnyPlayer?.(cardOwner, this, card, count);
          }
        }
      }
    }

    // Vermin hook (2 of 2)
    if (card.name === CardName.VERMIN) {
      const wasVerminInEffect = this.game.verminInEffect;
      this.game.verminInEffect = card.resourceCount >= 10;
      if (wasVerminInEffect === false && this.game.verminInEffect) {
        this.game.log('${0}\'s ${1} now has 10 animals. All players lose 1 VP per city.', (b) =>
          b.player(this).card(card));
      }
    }
  }

  public getCardsWithResources(resource?: CardResource): Array<ICard> {
    let result = this.tableau.filter((card) => card.resourceType !== undefined && card.resourceCount && card.resourceCount > 0);

    if (resource !== undefined) {
      result = result.filter((card) => card.resourceType === resource);
    }

    return result;
  }

  public getResourceCards(resource?: CardResource): Array<ICard> {
    let result = this.tableau.filter((card) => card.resourceType !== undefined);

    if (resource !== undefined) {
      result = result.filter((card) => card.resourceType === resource || card.resourceType === CardResource.WARE);
    }

    return result;
  }

  public getResourceCount(resource: CardResource): number {
    return sum(this.getCardsWithResources(resource).map((card) => card.resourceCount));
  }

  /** Conglomerates: the other player(s) on this player's team, or empty if teamless/not playing Conglomerates. */
  public teammates(): ReadonlyArray<IPlayer> {
    return ConglomeratesExpansion.teammates(this);
  }

  public getPlayableActionCards(): Array<ICard & IActionCard> {
    const result: Array<ICard & IActionCard> = [];
    for (const card of this.tableau) {
      if (isIActionCard(card) && !this.actionsThisGeneration.has(card.name) && !isCeoCard(card)) {
        if (card.canAct(this)) {
          result.push(card);
        }
      }
    }
    return result;
  }

  public runProductionPhase(): void {
    this.actionsThisGeneration.clear();
    this.removingPlayers = [];
    this.standardProjectsThisGeneration.clear();

    this.turmoilPolicyActionUsed = false;
    this.politicalAgendasActionUsedCount = 0;
    const energyKeepCap = getEnergyKeepCap(this);
    if (this.playedCards.has(CardName.SUPERCAPACITORS)) {
      Supercapacitors.onProduction(this);
    } else if (energyKeepCap > 0) {
      deferEnergyKeep(this, energyKeepCap);
    } else {
      const energyToConvert = this.energy;
      this.heat += energyToConvert;
      // Condensation Plant (Solaris, fan): 1 extra Heat per Energy converted here, i.e.
      // the standard end-of-generation Energy->Heat conversion becomes 2-for-1 instead of
      // 1-for-1. Only hooked into this default conversion path (not the Supercapacitors or
      // energy-keep-cap branches above, which are rare fan-card edge cases of their own).
      if (this.playedCards.has(CardName.CONDENSATION_PLANT)) {
        this.heat += energyToConvert;
      }
      this.energy = 0;
      this.finishProductionPhase();
    }
  }

  public finishProductionPhase() {
    this.megaCredits += this.production.megacredits + this.terraformRating;
    this.steel += this.production.steel;
    this.titanium += this.production.titanium;
    this.plants += this.production.plants;
    this.energy += this.production.energy;
    this.heat += this.production.heat;

    if (this.game.gameOptions.conglomeratesExpansion) {
      ConglomeratesExpansion.gainCoordination(this, 2, {log: true});
      ConglomeratesExpansion.resetTeamActionCosts(this);
    }

    for (const card of this.tableau) {
      card.onProductionPhase?.(this);
    }

    // Turn off CEO OPG actions that were activated this generation
    for (const card of this.playedCards) {
      if (isCeoCard(card)) {
        card.opgActionIsActive = false;
      }
    }
  }

  /**
   * ../..return {number} the number of avaialble megacredits. Which is just a shorthand for megacredits,
   * plus any units of heat available thanks to Helion (and Stormcraft, by proxy).
   */
  public spendableMegacredits(): number {
    let total = this.megaCredits;
    if (this.canUseHeatAsMegaCredits && !(this.canUseEnergyAsMegaCredits && this.tableau.has(CardName.SISTEMAS_SEEBECK))) {
      total += this.availableHeat();
    }
    if (this.canUseEnergyAsMegaCredits) {
      total += this.availableEnergy() * DEFAULT_PAYMENT_VALUES.energy;
    }
    if (this.canUseTitaniumAsMegacredits) {
      total += this.titanium * (this.titaniumValue - 1);
    }
    return total;
  }

  public runResearchPhase(restoring: boolean = false): void {
    const additionalResearch = this.game.additionalResearch;
    if (!restoring && (!this.game.gameOptions.draftVariant || this.game.isSoloMode())) {
      this.draftedCards = newStandardDraft(this.game).draw(this);
    }

    const selectable = this.researchSelectableCards(this.draftedCards);
    if (additionalResearch === undefined) {
      this.nextResearchKeepMax = undefined;
    }

    // Extra research retains its offers until purchase completes, including across reloads.
    const cards = additionalResearch === undefined ? copyAndClear(this.draftedCards) : this.draftedCards;

    const supportsResearchPurchaseUndo = this.game.gameOptions.undoStepOption === true && !(this.game.underworldDraftEnabled &&
      this.underworldData.corruption > 0 && cards.length >= 2 && this.game.projectDeck.size() >= 2);
    const chooseCardsToBuy = () => {
      // TODO(kberg): Using .execute to rely on directly calling setWaitingFor is not great.
      // It's because all players is drafting at the same time. Once again, the server isn't ideal
      // when it comes to handling multiple players at once.
      const action = new ChooseCards(this, cards, {
        paying: true,
        keepMax: selectable,
        onCardsSelected: supportsResearchPurchaseUndo ? () => this.beginResearchPurchaseUndo(cards.length, selectable) : undefined,
        onCardsKept: supportsResearchPurchaseUndo ?
          (logStartIndex, logEndIndex) => this.finishResearchPurchaseUndo(logStartIndex, logEndIndex) : undefined,
      }).execute();

      // ChooseCards.execute returns an action with an andThen set. That means
      // this has to wrap it around and do clever things.
      // Fortunately it's callback returns void, so this doesn't have to pass
      // something back another PlayerInput.
      const saved = action.cb;
      action.cb = ((response) => {
        saved(response);
        this.game.playerIsFinishedWithResearchPhase(this);
        return undefined;
      });
      return action;
    };

    if (this.game.underworldDraftEnabled &&
      additionalResearch?.exchangedPlayers.includes(this.id) !== true &&
      this.underworldData.corruption > 0 &&
      cards.length >= 2 &&
      this.game.projectDeck.size() >= 2) {
      // Player may spend 1 corruption to discard 2 cards and draw 2 cards.
      const options = new OrOptions();
      options.options.push(chooseCardsToBuy());
      options.options.push(new SelectCard('Spend 1 corruption to replace 2 cards', 'Spend Corruption', cards, {min: 2, max: 2}).andThen((discards) => {
        this.game.projectDeck.discard(...discards);
        UnderworldExpansion.loseCorruption(this, 1, {log: true});
        additionalResearch?.exchangedPlayers.push(this.id);
        for (const discard of discards) {
          inplaceRemove(cards, discard);
        }
        // Drawing from the top to maintain seeds.
        cards.push(...this.game.projectDeck.drawN(this.game, 2, 'top'));
        this.setWaitingFor(chooseCardsToBuy());

        return undefined;
      }));
      this.setWaitingFor(options);
    } else {
      this.setWaitingFor(chooseCardsToBuy());
    }
  }

  public canUndoResearchPurchase(): boolean {
    const state = this.researchPurchaseUndo;
    return state !== undefined &&
      this.game.gameOptions.undoStepOption === true &&
      this.game.phase === Phase.RESEARCH &&
      this.game.generation === state.generation &&
      this.game.hasResearched(this) &&
      this.getWaitingFor() === undefined;
  }

  public undoResearchPurchase(): void {
    if (!this.canUndoResearchPurchase()) {
      throw new Error('Card purchase can only be undone while waiting in the research phase');
    }
    const state = this.researchPurchaseUndo;
    if (state === undefined) {
      throw new Error('Missing card purchase undo state');
    }
    const selectedCards = this.cardsInHand.splice(state.cardsInHandStartIndex);
    const discardedCount = state.cardCount - selectedCards.length;
    const discardedCards = this.game.projectDeck.discardPile.splice(state.projectDiscardStartIndex, discardedCount);
    if (discardedCount < 0 || selectedCards.length + discardedCards.length !== state.cardCount) {
      throw new Error('Card purchase no longer matches the saved research selection');
    }

    const game = this.game;
    Object.assign(this, Player.deserialize(state.playerSnapshot));
    this.setup(game);
    this.researchPurchaseUndo = undefined;
    for (let index = state.logStartIndex ?? 0; index < (state.logEndIndex ?? 0); index++) {
      const message = game.gameLog[index];
      if (message !== undefined) {
        message.canceled = true;
      }
    }
    game.reopenResearchPhaseFor(this);
    game.log('${0} undid card purchase', (b) => b.player(this));

    const cards = [...selectedCards, ...discardedCards];
    const selectable = Math.min(this.researchSelectableCards(cards), state.keepMax ?? cards.length);
    this.setWaitingFor(this.createResearchPurchaseInput(cards, selectable));
  }

  private researchSelectableCards(cards: ReadonlyArray<IProjectCard>): number {
    let selectable = cards.length;
    if (this.playedCards.has(CardName.MARS_MATHS) && !this.playedCards.has(CardName.LUNA_PROJECT_OFFICE)) {
      selectable = Math.min(selectable, 4);
    }
    if (this.playedCards.has(CardName.BUDGET_RESTRICTIONS)) {
      selectable = Math.min(selectable, 3);
    }
    if (this.nextResearchKeepMax !== undefined) {
      selectable = Math.min(selectable, this.nextResearchKeepMax);
    }
    return selectable;
  }

  private createResearchPurchaseInput(cards: ReadonlyArray<IProjectCard>, selectable: number): PlayerInput {
    const action = new ChooseCards(this, cards, {
      paying: true,
      keepMax: selectable,
      onCardsSelected: () => this.beginResearchPurchaseUndo(cards.length, selectable),
      onCardsKept: (logStartIndex, logEndIndex) => this.finishResearchPurchaseUndo(logStartIndex, logEndIndex),
    }).execute();
    const saved = action.cb;
    action.cb = ((response) => {
      saved(response);
      this.game.playerIsFinishedWithResearchPhase(this);
      return undefined;
    });
    return action;
  }

  private beginResearchPurchaseUndo(cardCount: number, keepMax: number): void {
    this.researchPurchaseUndo = undefined;
    this.researchPurchaseUndo = {
      playerSnapshot: this.serialize(),
      cardCount,
      keepMax,
      cardsInHandStartIndex: this.cardsInHand.length,
      projectDiscardStartIndex: this.game.projectDeck.discardPile.length,
      generation: this.game.generation,
    };
  }

  private finishResearchPurchaseUndo(logStartIndex: number, logEndIndex: number): void {
    if (this.researchPurchaseUndo !== undefined) {
      this.researchPurchaseUndo.logStartIndex = logStartIndex;
      this.researchPurchaseUndo.logEndIndex = logEndIndex;
    }
  }

  public getCardCost(card: IProjectCard): number {
    let cost = card.cost;
    cost -= this.colonies.cardDiscount;

    for (const playedCard of this.tableau) {
      cost -= playedCard.getCardDiscount?.(this, card) ?? 0;
    }

    // Playwrights hook
    this.removedFromPlayCards.forEach((removedFromPlayCard) => {
      if (removedFromPlayCard.getCardDiscount !== undefined) {
        cost -= removedFromPlayCard.getCardDiscount(this, card);
      }
    });

    // A card discounting its own purchase cost (unlike getCardDiscount, which only ever
    // applies to other cards, since this card isn't in the tableau yet).
    cost -= card.getOwnCostReduction?.(this) ?? 0;

    // TODO(kberg): put this in a callback.
    // Vanilla only -- More Parties reuses 'up04' for an unrelated action.
    if (!this.game.gameOptions.morePartiesExpansion &&
        card.tags.includes(Tag.SPACE) && PartyHooks.shouldApplyPolicy(this, PartyName.UNITY, 'up04')) {
      cost -= 2;
    }

    // Tax effects from a played card (e.g. Blockhouse), unlike getCardDiscount which
    // only ever benefits the acting player's own plays. Applies to every player's tableau,
    // including this player's own.
    for (const owner of this.game.players) {
      for (const playedCard of owner.tableau) {
        cost += playedCard.getCardCostIncrease?.(owner, this, card) ?? 0;
      }
    }

    return Math.max(cost, 0);
  }

  private paymentOptionsForCard(card: IProjectCard): PaymentOptions {
    return {
      heat: this.canUseHeatAsMegaCredits,
      energy: this.canUseEnergyAsMegaCredits,
      steel: this.lastCardPlayed === CardName.LAST_RESORT_INGENUITY || card.tags.includes(Tag.BUILDING) ||
        (card.tags.includes(Tag.CITY) && this.tableau.has(CardName.BLOCKHOUSE)),
      plants: card.tags.includes(Tag.BUILDING) && this.playedCards.has(CardName.MARTIAN_LUMBER_CORP),
      titanium: this.lastCardPlayed === CardName.LAST_RESORT_INGENUITY || card.tags.includes(Tag.SPACE),
      lunaTradeFederationTitanium: this.canUseTitaniumAsMegacredits,
      seeds: card.tags.includes(Tag.PLANT) || card.name === CardName.GREENERY_STANDARD_PROJECT,
      floaters: card.tags.includes(Tag.VENUS),
      microbes: card.tags.includes(Tag.PLANT),
      nereidMicrobes: card.tags.includes(Tag.JOVIAN),
      lunaArchivesScience: card.tags.includes(Tag.MOON),
      spireScience: card.type === CardType.STANDARD_PROJECT,
      auroraiData: card.type === CardType.STANDARD_PROJECT,
      graphene: card.tags.includes(Tag.CITY) || card.tags.includes(Tag.SPACE),
      kuiperAsteroids: card.name === CardName.AQUIFER_STANDARD_PROJECT || card.name === CardName.ASTEROID_STANDARD_PROJECT,
      // Only Cloud City/Gas Mine/Floater Array (Venus Phase 2's own standard projects) accept
      // this -- they opt in themselves via their own canPayWith(), not via this regular-card path.
      anyFloaters: false,
    };
  }

  public checkPaymentAndPlayCard(selectedCard: IProjectCard, payment: Payment, cardAction: CardAction = 'add') {
    const cardCost = this.getCardCost(selectedCard);

    const reserved = MoonExpansion.adjustedReserveCosts(this, selectedCard);

    if (!this.canSpend(payment, reserved)) {
      throw new Error('You do not have that many resources to spend');
    }

    if (payment.floaters > 0) {
      if (selectedCard.name === CardName.STRATOSPHERIC_BIRDS && payment.floaters === this.getSpendable('floaters')) {
        const cardsWithFloater = this.getCardsWithResources(CardResource.FLOATER);
        if (cardsWithFloater.length === 1) {
          throw new Error('Cannot spend all floaters to play Stratospheric Birds');
        }
      }
    }

    if (payment.microbes > 0) {
      if (selectedCard.name === CardName.SOIL_ENRICHMENT && payment.microbes === this.getSpendable('microbes')) {
        const cardsWithMicrobe = this.getCardsWithResources(CardResource.MICROBE);
        if (cardsWithMicrobe.length === 1) {
          throw new Error('Cannot spend all microbes to play Soil Enrichment');
        }
      }
    }

    // TODO(kberg): Move this.paymentOptionsForCard to a parameter.
    let totalToPay = this.payingAmount(payment, this.paymentOptionsForCard(selectedCard));

    // Blockhouse: steel is worth 2 M€ extra when paying for a City-tagged card.
    if (payment.steel > 0 && selectedCard.tags.includes(Tag.CITY) && this.tableau.has(CardName.BLOCKHOUSE)) {
      totalToPay += payment.steel * 2;
    }

    if (totalToPay < cardCost) {
      throw new Error('Did not spend enough to pay for card');
    }
    return this.playCard(selectedCard, payment, cardAction);
  }

  public resourcesOnCard(name: CardName): number {
    return this.playedCards.get(name)?.resourceCount ?? 0;
  }

  public getSpendable(SpendableResource: SpendableCardResource): number {
    return this.resourcesOnCard(CARD_FOR_SPENDABLE_RESOURCE[SpendableResource]);
  }

  public pay(payment: Payment) {
    const standardUnits = Units.of({
      megacredits: payment.megacredits,
      steel: payment.steel,
      titanium: payment.titanium,
      plants: payment.plants,
    });

    this.stock.deductUnits(standardUnits);

    const stormcraftFloaters = this.resourcesOnCard(CardName.STORMCRAFT_INCORPORATED);
    const otherFloaters = this.getResourceCount(CardResource.FLOATER) - stormcraftFloaters - payment.floaters;
    const reservedFloaters = Math.max(0, payment.anyFloaters - otherFloaters);
    let heatToPay = payment.heat;
    if (this.tableau.has(CardName.SISTEMAS_SEEBECK)) {
      const fromEnergy = Math.min(payment.energy, this.energy);
      const fromHeat = Math.min(payment.heat, this.heat);
      this.stock.deduct(Resource.ENERGY, fromEnergy);
      this.stock.deduct(Resource.HEAT, fromHeat);
      heatToPay += payment.energy - fromEnergy - fromHeat;
    } else {
      this.stock.deduct(Resource.ENERGY, payment.energy);
    }
    if (heatToPay > 0) {
      this.defer(this.spendHeat(heatToPay, () => undefined, reservedFloaters), Priority.COST);
    }

    if (payment.anyFloaters > 0) {
      // Unlike every removeResourcesOnCard() call below, this isn't bound to one fixed card --
      // one deferred removal per floater, each independently picking a card (an interactive
      // SelectCard prompt if more than one qualifies, or a silent auto-deduction if only one
      // does; see RemoveResourcesFromCard). Lets a single payment draw floaters from several
      // different cards if the player chooses to.
      //
      // Priority.COST (not RemoveResourcesFromCard's own default LOSE_RESOURCE_OR_PRODUCTION):
      // pay() runs synchronously as part of the card being played, and the card's own effect
      // (e.g. tile placement) gets deferred at Priority.DEFAULT immediately afterward, in the
      // very same call stack -- both land in the queue before this method returns, so it's their
      // relative priority, not queue order, that decides who resolves first. COST already exists
      // for exactly this "pay before the effect" ordering (paying a blue card action's cost).
      for (let i = 0; i < payment.anyFloaters; i++) {
        const removal = new RemoveResourcesFromCard(this, CardResource.FLOATER, 1,
          {source: 'self', mandatory: true, blockable: false});
        removal.priority = Priority.COST;
        this.game.defer(removal);
      }
    }

    const removeResourcesOnCard = (name: CardName, count: number) => {
      if (count === 0) {
        return;
      }
      const card = this.playedCards.get(name);
      if (card === undefined) {
        throw new Error('Card ' + name + ' not found');
      }
      // TODO(kberg): I suggest not logging this. Or do something fuller.
      this.removeResourceFrom(card, count, {log: true});
    };

    removeResourcesOnCard(CardName.PSYCHROPHILES, payment.microbes);
    removeResourcesOnCard(CardName.DIRIGIBLES, payment.floaters);
    removeResourcesOnCard(CardName.LUNA_ARCHIVES, payment.lunaArchivesScience);
    removeResourcesOnCard(CardName.SPIRE, payment.spireScience);
    removeResourcesOnCard(CardName.CARBON_NANOSYSTEMS, payment.graphene);
    removeResourcesOnCard(CardName.SOYLENT_SEEDLING_SYSTEMS, payment.seeds);
    removeResourcesOnCard(CardName.AURORAI, payment.auroraiData);
    removeResourcesOnCard(CardName.KUIPER_COOPERATIVE, payment.kuiperAsteroids);
    removeResourcesOnCard(CardName.NEREID_BIOSYSTEMS, payment.nereidMicrobes);

    if (payment.megacredits > 0 || payment.steel > 0 || payment.titanium > 0) {
      PathfindersExpansion.addToSolBank(this);
    }
  }

  public playCard(selectedCard: IProjectCard, payment?: Payment, cardAction: CardAction = 'add'): void {
    if (payment !== undefined) {
      this.pay(payment);
    }

    const selfReplicatingRobots = this.tableau.get(CardName.SELF_REPLICATING_ROBOTS);
    if (selfReplicatingRobots instanceof SelfReplicatingRobots) {
      if (inplaceRemove(selfReplicatingRobots.targetCards, selectedCard)) {
        selectedCard.resourceCount = 0;
      }
    }

    ColoniesHandler.maybeActivateColonies(this.game, selectedCard);

    if (selectedCard.type !== CardType.PROXY) {
      this.lastCardPlayed = selectedCard.name;
      const logPayment = payment === undefined ? undefined : toLogPayment(payment);
      this.game.log('${0} played ${1}', (b) => b.player(this).card(selectedCard), {payment: logPayment});
    }

    // Play the card
    //
    // IMPORTANT: This is the wrong place to take the play card action.
    // It should be played after putting the card into the playedCards array.
    // That makes sense because every card that has an "including this" behavior is
    // actually hacked to +1 things. That's too bad. It means all our code and tests are
    // a little busted.
    //
    // By the way, this "including this" issue does not happen with corporation cards.
    //
    // This issue is evident when playing New Partner, and drawing Double Down.
    // The issue is fixed in Double Down for the time being. But the right fix is to move this block
    // down. As I say, that's going to break a lot of things, many of which are not evident
    // in tests (because they use card.play instad of player.playCard).
    const action = selectedCard.play(this);
    this.defer(action, Priority.DEFAULT);

    // This could probably include 'nothing' but for now this will work.
    if (cardAction !== 'discard') {
      // Remove card from hand
      const projectCardIndex = this.cardsInHand.findIndex((card) => card.name === selectedCard.name);
      const preludeCardIndex = this.preludeCardsInHand.findIndex((card) => card.name === selectedCard.name);
      if (projectCardIndex !== -1) {
        this.cardsInHand.splice(projectCardIndex, 1);
      } else if (preludeCardIndex !== -1) {
        this.preludeCardsInHand.splice(preludeCardIndex, 1);
      }
    }

    switch (cardAction) {
    case 'add':
      if (selectedCard.name !== CardName.LAW_SUIT && selectedCard.name !== CardName.PRIVATE_INVESTIGATOR) {
        this.playedCards.push(selectedCard);
      }
      break;
    // Card is already played. Discard it.
    case 'discard':
      this.discardPlayedCard(selectedCard);
      break;
    // Do nothing. Good for fake cards and replaying events.
    case 'nothing':
      break;
    // Do nothing, used for Double Down.
    case 'double-down':
      break;
    }

    // See comment above regarding

    // See DeclareCloneTag for why this skips cards with clone tags.
    if (!selectedCard.tags.includes(Tag.CLONE) && cardAction !== 'double-down') {
      this.onCardPlayed(selectedCard);
    }

    return undefined;
  }

  public triggerOnNonCardTagAdded(tag: Tag): void {
    for (const card of this.tableau) {
      card.onNonCardTagAdded?.(this, tag);
    }
  }

  public onCardPlayed(card: ICard) {
    if (card.type === CardType.PROXY) {
      return;
    }

    /* A player responding to their own cards played. */
    for (const effectCard of this.playedCards) {
      this.defer(effectCard.onCardPlayed?.(this, card));
    }

    TurmoilHandler.applyOnCardPlayedEffect(this, card);

    /* A player responding to any other player's card played. */
    for (const somePlayer of this.game.playersInGenerationOrder) {
      for (const effectCard of somePlayer.playedCards) {
        const actionFromPlayedCard = effectCard.onCardPlayedByAnyPlayer?.(somePlayer, card, this);
        this.defer(actionFromPlayedCard);
      }
    }

    PathfindersExpansion.onCardPlayed(this, card);
  }

  public playActionCard(): PlayerInput {
    return new SelectCard<ICard & IActionCard>(
      'Perform an action from a played card',
      'Take action',
      this.getPlayableActionCards(),
      {selectBlueCardAction: true})
      .andThen(([card]) => {
        this.game.log('${0} used ${1} action', (b) => b.player(this).card(card));
        const action = card.action(this);
        this.defer(action);
        this.actionsThisGeneration.add(card.name);
        return undefined;
      });
  }

  private getPlayCeoOPGAction(): PlayerInput | undefined {
    const cards = CeoExtension.getUsableOPGCeoCards(this);
    if (cards.length === 0) {
      return undefined;
    }
    return new SelectCard<ICeoCard & IActionCard>(
      'Use CEO once per game action',
      'Take action',
      cards,
      {selectBlueCardAction: true})
      .andThen(([card]) => {
        this.game.log('${0} used ${1} action', (b) => b.player(this).card(card));
        const action = card.action(this);
        this.defer(action);
        this.actionsThisGeneration.add(card.name);
        return undefined;
      });
  }

  public playCorporationCard(corporationCard: ICorporationCard): void {
    const additionalCorp = this.playedCards.corporations().length > 0;

    this.playedCards.push(corporationCard);

    // Update starting MC
    this.megaCredits += corporationCard.startingMegaCredits;
    // Update card cost.
    if (corporationCard.cardCost !== undefined) {
      this.cardCost += corporationCard.cardCost - constants.CARD_COST;
    }

    if (additionalCorp === false && corporationCard.name !== CardName.BEGINNER_CORPORATION) {
      const diff = this.cardsInHand.length * this.cardCost;
      this.stock.deduct(Resource.MEGACREDITS, diff);
      if (diff > 0) {
        PathfindersExpansion.addToSolBank(this);
      }
    }
    this.game.log('${0} played ${1}', (b) => b.player(this).card(corporationCard));
    // Calculating this before playing the corporation card, which might change the player's hand size.
    const numberOfCardInHand = this.cardsInHand.length;
    ColoniesHandler.maybeActivateColonies(this.game, corporationCard);
    this.defer(corporationCard.play(this));
    if (corporationCard.initialAction !== undefined && corporationCard.initialActionText !== undefined) {
      this.pendingInitialActions.push(corporationCard);
    }
    if (additionalCorp === false) {
      this.game.log('${0} kept ${1} project cards', (b) => b.player(this).number(numberOfCardInHand));
    }

    this.onCardPlayed(corporationCard);

    if (!additionalCorp) {
      this.game.playerIsFinishedWithResearchPhase(this);
    }
  }

  public drawCard(count?: number, options?: DrawOptions): undefined {
    return DrawCards.keepAll(this, count, options).execute();
  }

  public drawCardKeepSome(count: number, options: AllOptions): void {
    this.game.defer(DrawCards.keepSome(this, count, options));
  }

  public discardPlayedCard(card: IProjectCard) {
    const found = this.playedCards.remove(card);
    if (found === false) {
      console.error(`Error: card ${card.name} not in ${this.id}'s hand`);
      return;
    }
    this.game.projectDeck.discard(card);
    card.onDiscard?.(this);
    card.resourceCount = 0;
    this.game.log('${0} discarded ${1}', (b) => b.player(this).card(card));
  }

  public discardCardFromHand(card: IProjectCard, options?: {log?: boolean}) {
    const found = inplaceRemove(this.cardsInHand, card);
    if (found === false) {
      console.error(`Error: card ${card.name} not in ${this.id}'s hand`);
      return;
    }
    this.game.projectDeck.discard(card);
    if (options?.log === true) {
      this.game.log('${0} discarded ${1}', (b) => b.player(this).card(card), {reservedFor: this});
    }
  }

  public availableHeat(): number {
    const floaters = this.resourcesOnCard(CardName.STORMCRAFT_INCORPORATED);
    let total = this.heat + (floaters * 2);
    if (this.tableau.has(CardName.SISTEMAS_SEEBECK)) {
      total += this.energy;
    }
    return total;
  }

  public availableEnergy(): number {
    let total = this.energy;
    if (this.tableau.has(CardName.SISTEMAS_SEEBECK)) {
      const floaters = this.resourcesOnCard(CardName.STORMCRAFT_INCORPORATED);
      total += this.heat + (floaters * 2);
    }
    return total;
  }

  public spendHeat(amount: number, cb: () => (undefined | PlayerInput) = () => undefined, reservedFloaters: number = 0): PlayerInput | undefined {
    if (amount === 0) {
      return cb();
    }
    const stormcraft = <StormCraftIncorporated> this.tableau.get(CardName.STORMCRAFT_INCORPORATED);
    if (stormcraft?.resourceCount > 0) {
      return stormcraft.spendHeat(this, amount, cb, reservedFloaters);
    }
    if (this.tableau.has(CardName.SISTEMAS_SEEBECK) && this.heat < amount) {
      const fromHeat = Math.min(this.heat, amount);
      this.stock.deduct(Resource.HEAT, fromHeat);
      this.stock.deduct(Resource.ENERGY, amount - fromHeat);
      return cb();
    }
    this.stock.deduct(Resource.HEAT, amount);
    return cb();
  }

  public spendEnergy(amount: number, cb: () => (undefined | PlayerInput) = () => undefined): PlayerInput | undefined {
    const fromEnergy = Math.min(this.energy, amount);
    this.stock.deduct(Resource.ENERGY, fromEnergy);
    if (this.tableau.has(CardName.SISTEMAS_SEEBECK) && fromEnergy < amount) {
      return this.spendHeat(amount - fromEnergy, cb);
    }
    return cb();
  }

  public claimableMilestones(): Array<IMilestone> {
    if (this.game.allMilestonesClaimed()) {
      return [];
    }
    const cost = this.milestoneCost();
    if (cost === 0 || this.canAfford(cost)) {
      return this.game.milestones
        .filter((milestone) => !this.game.milestoneClaimed(milestone) && milestone.canClaim(this));
    }
    return [];
  }

  private claimMilestone(milestone: IMilestone) {
    if (this.game.milestoneClaimed(milestone)) {
      throw new Error(milestone.name + ' is already claimed');
    }

    const recordClaim = () => {
      this.game.log('${0} claimed ${1} milestone', (b) => b.player(this).milestone(milestone));
      this.game.claimedMilestones.push({
        player: this,
        milestone: milestone,
      });
      // VanAllen CEO Hook for Milestones
      const vanAllen = this.game.getCardPlayerOrUndefined(CardName.VANALLEN);
      if (vanAllen !== undefined) {
        vanAllen.stock.add(Resource.MEGACREDITS, 3, {log: true, from: {card: CardName.VANALLEN}});
      }
      if (this.game.gameOptions.conglomeratesExpansion) {
        ConglomeratesExpansion.gainCoordination(this, 1, {log: true});
      }
    };

    if (this.playedCards.has(CardName.VANALLEN)) {
      recordClaim();
    } else {
      const baseCost = this.milestoneCost();
      const cost = baseCost + ((milestone.name === 'Briber') ? 12 : 0);
      const reserveUnits = milestone.name === 'Merchant' ? Units.every(2) : Units.EMPTY;
      this.game.defer(new SelectPaymentDeferred(this, cost, {title: 'Select how to pay for milestone', reserveUnits: reserveUnits})).andThen(() => {
        recordClaim();
      });
    }
  }

  private isStagedProtestsActive() {
    const owner = this.game.getCardPlayerOrUndefined(CardName.STAGED_PROTESTS);
    if (owner === undefined) {
      return false;
    }
    const stagedProtests = owner.tableau.get(CardName.STAGED_PROTESTS);
    return stagedProtests?.generationUsed === this.game.generation;
  }

  public milestoneCost() {
    if (this.playedCards.has(CardName.VANALLEN) || this.playedCards.has(CardName.NIRGAL_ENTERPRISES)) {
      return 0;
    }
    const base = this.game.gameOptions.conglomeratesExpansion ? Math.ceil(MILESTONE_COST * 1.5) : MILESTONE_COST;
    return this.isStagedProtestsActive() ? base + 8 : base;
  }

  // Public for tests.
  public awardFundingCost() {
    if (this.playedCards.has(CardName.NIRGAL_ENTERPRISES)) {
      return 0;
    }
    const plus8 = this.isStagedProtestsActive() ? 8 : 0;
    return this.game.getAwardFundingCost() + plus8;
  }

  private fundAward(award: IAward): PlayerInput {
    return new SelectOption(award.name, 'Fund - ' + '(' + award.name + ')').andThen(() => {
      this.game.defer(new SelectPaymentDeferred(this, this.awardFundingCost(), {title: 'Select how to pay for award'}));
      this.game.fundAward(this, award);
      if (this.game.gameOptions.conglomeratesExpansion) {
        ConglomeratesExpansion.gainCoordination(this, 1, {log: true});
      }
      return undefined;
    });
  }

  private endTurnOption(): PlayerInput {
    return new SelectOption('End Turn', 'End').andThen(() => {
      this.actionsTakenThisRound = this.availableActionsThisRound; // This allows for variable actions per turn, like Mars Maths
      this.game.log('${0} ended turn', (b) => b.player(this));
      return undefined;
    });
  }

  public pass(): void {
    this.game.playerHasPassed(this);
    this.lastCardPlayed = undefined;
    this.autopass = false;
    this.game.log('${0} passed', (b) => b.player(this));
  }

  private passOption(): PlayerInput {
    const option = new SelectOption('Pass for this generation', 'Pass').andThen(() => {
      this.pass();
      return undefined;
    });
    option.warnings = ['pass'];
    return option;
  }

  private surrenderOption(): PlayerInput {
    return new SelectOption('Surrender this game and start a bot', 'Surrender and start bot')
      .annotate(SURRENDER_ACTION_ANNOTATION)
      .andThen(() => {
        const confirmation = new OrOptions()
          .setTitle('Surrender this game? A bot will continue playing for you.')
          .setButtonLabel('Confirm')
          .annotate(SURRENDER_CONFIRMATION_ANNOTATION);

        confirmation.options.push(new SelectOption('Surrender this game and start a bot', 'Surrender and start bot').andThen(() => {
          return undefined;
        }));
        confirmation.options.push(new SelectOption('Continue playing', 'Continue').andThen(() => {
          // The outer action callback increments these after the confirmation closes.
          this.actionsTakenThisRound--;
          this.actionsTakenThisGame--;
          return undefined;
        }));

        return confirmation;
      });
  }

  public takeActionForFinalGreenery(): void {
    const resolveFinalGreeneryDeferredActions = () => {
      this.game.deferredActions.runAll(() => this.takeActionForFinalGreenery());
    };

    // Resolve any deferredAction before placing the next greenery
    // Otherwise if two tiles are placed next to Philares, only the last benefit is triggered
    // if Philares does not accept the first bonus before the second tile is down
    if (this.game.deferredActions.length > 0) {
      resolveFinalGreeneryDeferredActions();
      return;
    }

    if (this.game.canPlaceGreenery(this)) {
      const action = new OrOptions()
        .setTitle('Place any final greenery from plants')
        .setButtonLabel('Confirm');
      action.options.push(
        new SelectSpace(
          'Select space for greenery tile',
          this.game.board.getAvailableSpacesForGreenery(this))
          .andThen((space) => {
            // Do not raise oxygen or award TR for final greenery placements
            this.game.addGreenery(this, space, false);
            this.stock.deduct(Resource.PLANTS, this.plantsNeededForGreenery);

            // Resolve Philares deferred actions and maybe place another greenery
            resolveFinalGreeneryDeferredActions();
            return undefined;
          }));
      action.options.push(
        new SelectOption('Don\'t place a greenery').andThen(() => {
          this.game.playerIsDoneWithGame(this);
          return undefined;
        }),
      );
      this.setWaitingForSafely(action);
      return;
    }

    if (this.game.deferredActions.length > 0) {
      resolveFinalGreeneryDeferredActions();
    } else {
      this.game.playerIsDoneWithGame(this);
    }
  }

  public getPlayableCards(): Array<IProjectCard> {
    const candidateCards: Array<IProjectCard> = [...this.cardsInHand];
    // Self Replicating robots check
    const card = this.tableau.get(CardName.SELF_REPLICATING_ROBOTS);
    if (card instanceof SelfReplicatingRobots) {
      candidateCards.push(...card.targetCards);
    }

    const playableCards: Array<IProjectCard> = [];
    for (const card of candidateCards) {
      card.clearWarnings();
      card.additionalProjectCosts = undefined;
      if (this.canPlay(card)) {
        playableCards.push(card);
      }
    }
    return playableCards;
  }

  public affordOptionsForCard(card: IProjectCard): CanAffordOptions {
    let trSource: TRSource = {};
    if (card.tr) {
      trSource = card.tr;
    } else {
      const computedTr = card.computeTr?.(this);
      if (computedTr !== undefined) {
        trSource = computedTr;
      } else if (card.behavior !== undefined) {
        trSource = getBehaviorExecutor().toTRSource(card.behavior, new Counter(this, card));
      }
    }

    const pharmacyUnion = this.tableau.get(CardName.PHARMACY_UNION);
    if ((pharmacyUnion?.resourceCount ?? 0 > 0) && this.tags.cardHasTag(card, Tag.SCIENCE)) {
      trSource.tr = (trSource.tr ?? 0) + 1;
    }

    const cost = this.getCardCost(card);
    const paymentOptionsForCard = this.paymentOptionsForCard(card);
    return {
      cost,
      ...paymentOptionsForCard,
      reserveUnits: MoonExpansion.adjustedReserveCosts(this, card),
      tr: trSource,
    };
  }

  public canPlay(card: IProjectCard): boolean {
    card.additionalProjectCosts = undefined;
    const options = this.affordOptionsForCard(card);
    const canAfford = this.canAffordInternal(options);
    if (!canAfford.canAfford) {
      return false;
    }
    const canPlay = card.canPlay(this, options);
    if (canPlay === false) {
      return false;
    }
    if (canAfford.redsCost > 0) {
      card.additionalProjectCosts = card.additionalProjectCosts ?? {};
      card.additionalProjectCosts.redsCost = canAfford.redsCost;
    }
    if (this.playedCards.has(CardName.PHARMACY_UNION) && card.tags.includes(Tag.MICROBE)) {
      const pharmacyUnion = this.tableau.get(CardName.PHARMACY_UNION);
      if (pharmacyUnion?.isDisabled === false) {
        card.addWarning('pharmacyUnion');
      }
    }
    return true;
  }

  /**
   * Returns the most you can spend if the given reserved units are excluded.
   */
  private maxSpendable(reserveUnits: Units = Units.EMPTY): Payment {
    const shared = this.tableau.has(CardName.SISTEMAS_SEEBECK);
    const stock = this.heat + (shared ? this.energy : 0);
    const reserved = reserveUnits.heat + (shared ? reserveUnits.energy : 0);
    const reservedFloaters = Math.ceil(Math.max(0, reserved - stock) / 2);
    const floaterOverpayment = Math.max(0, reservedFloaters * 2 - reserved);
    return {
      megacredits: this.megaCredits - reserveUnits.megacredits,
      steel: this.steel - reserveUnits.steel,
      titanium: this.titanium - reserveUnits.titanium,
      plants: this.plants - reserveUnits.plants,
      heat: this.availableHeat() - reserved - floaterOverpayment,
      energy: this.availableEnergy() - reserveUnits.energy - (shared ? reserveUnits.heat + floaterOverpayment : 0),
      floaters: this.getSpendable('floaters'),
      microbes: this.getSpendable('microbes'),
      lunaArchivesScience: this.getSpendable('lunaArchivesScience'),
      spireScience: this.getSpendable('spireScience'),
      seeds: this.getSpendable('seeds'),
      auroraiData: this.getSpendable('auroraiData'),
      graphene: this.getSpendable('graphene'),
      kuiperAsteroids: this.getSpendable('kuiperAsteroids'),
      nereidMicrobes: this.getSpendable('nereidMicrobes'),
      // Unlike every card resource above, floaters here aren't bound to one fixed CardName --
      // this sums across every card the player holds them on (Player.pay() resolves which
      // card(s) they actually come from, interactively if more than one qualifies).
      anyFloaters: this.getResourceCount(CardResource.FLOATER) - reservedFloaters,
    };
  }

  public canSpend(payment: Payment, reserveUnits?: Units): boolean {
    const maxPayable = this.maxSpendable(reserveUnits);

    if (this.tableau.has(CardName.SISTEMAS_SEEBECK) && payment.energy + payment.heat > maxPayable.energy) {
      return false;
    }
    const shared = this.tableau.has(CardName.SISTEMAS_SEEBECK);
    const stock = this.heat + (shared ? this.energy : 0);
    const reserved = (reserveUnits?.heat ?? 0) + (shared ? reserveUnits?.energy ?? 0 : 0);
    const reservedFloaters = Math.ceil(Math.max(0, reserved - stock) / 2);
    const rawHeat = stock - Math.max(0, reserved - reservedFloaters * 2);
    const thermalFloaters = Math.ceil(Math.max(0, payment.heat + (shared ? payment.energy : 0) - rawHeat) / 2);
    if (payment.anyFloaters + payment.floaters + thermalFloaters > maxPayable.anyFloaters) {
      return false;
    }
    return SPENDABLE_RESOURCES.every((key) =>
      0 <= payment[key] && payment[key] <= maxPayable[key]);
  }

  /**
   * Returns the value of the suppled payment given the payment options.
   *
   * For example, if the payment is 3M€ and 2 steel, given that steel by default is
   * worth 2M€, this will return 7.
   *
   * ../..param {Payment} payment the resources being paid.
   * ../..param {PaymentOptions} options any configuration defining the accepted form of payment.
   * ../..return {number} a number representing the value of payment in M€.
   */
  public payingAmount(payment: Payment, options?: Partial<PaymentOptions>): number {
    const multiplier = {
      ...DEFAULT_PAYMENT_VALUES,
      steel: this.getSteelValue(),
      titanium: this.getTitaniumValue(),
      anyFloaters: this.getFloaterValue(),
    };

    const usable: {[key in SpendableResource]: boolean} = {
      megacredits: true,
      steel: options?.steel ?? false,
      titanium: options?.titanium ?? false,
      heat: this.canUseHeatAsMegaCredits,
      energy: this.canUseEnergyAsMegaCredits,
      plants: options?.plants ?? false,
      microbes: options?.microbes ?? false,
      floaters: options?.floaters ?? false,
      lunaArchivesScience: options?.lunaArchivesScience ?? false,
      spireScience: options?.spireScience ?? false,
      seeds: options?.seeds ?? false,
      auroraiData: options?.auroraiData ?? false,
      graphene: options?.graphene ?? false,
      kuiperAsteroids: options?.kuiperAsteroids ?? false,
      nereidMicrobes: options?.nereidMicrobes ?? false,
      anyFloaters: options?.anyFloaters ?? false,
    };

    // HOOK: Luna Trade Federation
    if (usable.titanium === false && payment.titanium > 0 && this.canUseTitaniumAsMegacredits) {
      usable.titanium = true;
      multiplier.titanium -= 1;
    }

    let totalToPay = 0;
    for (const key of SPENDABLE_RESOURCES) {
      if (usable[key]) {
        totalToPay += payment[key] * multiplier[key];
      }
    }

    return totalToPay;
  }

  private static CANNOT_AFFORD = {canAfford: false, redsCost: 0} as const;

  /**
   * Returns information about whether a player can afford to spend money with other costs and ways to pay taken into account.
   */
  private canAffordInternal(options: CanAffordOptions): {redsCost: number, canAfford: boolean} {
    // TODO(kberg): These are set both here and in SelectPayment. Consolidate, perhaps.
    options.heat = this.canUseHeatAsMegaCredits;
    options.energy = this.canUseEnergyAsMegaCredits;
    options.lunaTradeFederationTitanium = this.canUseTitaniumAsMegacredits;

    const reserveUnits = options.reserveUnits ?? Units.EMPTY;
    if (reserveUnits.heat > 0 || reserveUnits.energy > 0) {
      // Special-case heat and energy (Stormcraft floaters, Sistemas Seebeck)
      const unitsWithoutHeatOrEnergy = {...reserveUnits, heat: 0, energy: 0};
      if (!this.stock.has(unitsWithoutHeatOrEnergy)) {
        return Player.CANNOT_AFFORD;
      }
      if (this.availableHeat() < reserveUnits.heat) {
        return Player.CANNOT_AFFORD;
      }
      if (this.availableEnergy() < reserveUnits.energy) {
        return Player.CANNOT_AFFORD;
      }
    } else {
      if (!this.stock.has(reserveUnits)) {
        return Player.CANNOT_AFFORD;
      }
    }

    const maxPayable = this.maxSpendable(reserveUnits);
    if (maxPayable.energy < 0 || maxPayable.heat < 0) {
      return Player.CANNOT_AFFORD;
    }
    if (this.tableau.has(CardName.SISTEMAS_SEEBECK) && this.canUseEnergyAsMegaCredits) {
      maxPayable.heat = 0;
    }
    const redsCost = TurmoilHandler.computeTerraformRatingBump(this, options.tr) * REDS_RULING_POLICY_COST;
    if (redsCost > 0) {
      const usableForRedsCost = this.payingAmount(maxPayable, {});
      if (usableForRedsCost < redsCost) {
        return Player.CANNOT_AFFORD;
      }
    }

    let usable = this.payingAmount(maxPayable, options);
    if (options.anyFloaters) {
      const shared = this.tableau.has(CardName.SISTEMAS_SEEBECK);
      const thermalValue = shared && this.canUseEnergyAsMegaCredits ? DEFAULT_PAYMENT_VALUES.energy :
        this.canUseHeatAsMegaCredits ? DEFAULT_PAYMENT_VALUES.heat : 0;
      const remainingHeat = shared ? maxPayable.energy : maxPayable.heat;
      const stormcraftFloaters = Math.min(this.resourcesOnCard(CardName.STORMCRAFT_INCORPORATED), Math.ceil(remainingHeat / 2));
      usable -= Math.min(stormcraftFloaters * 2, remainingHeat) * Math.min(thermalValue, this.getFloaterValue() / 2);
      if (options.floaters) {
        usable -= maxPayable.floaters * Math.min(DEFAULT_PAYMENT_VALUES.floaters, this.getFloaterValue());
      }
    }

    const canAfford = options.cost + redsCost <= usable;
    return {canAfford, redsCost};
  }

  /**
   * Returns `true` if the player can afford to pay `options.cost` mc (possibly replaceable with steel, titanium etc.)
   * and additionally pay the reserveUnits (no replaces here)
   */
  public canAfford(o: number | CanAffordOptions): boolean {
    // Short circuit when players have enough MC.
    if (typeof(o) === 'number' && o <= this.stock.megacredits) {
      return true;
    }
    const options: CanAffordOptions = typeof(o) === 'number' ? {cost: o} : {...o};
    return this.canAffordInternal(options).canAfford;
  }

  public getStandardProjectOption(): SelectStandardProjectToPlay {
    const standardProjects: Array<IStandardProjectCard> = this.game.getStandardProjects();

    // Conglomerates: each of the 3 Team Actions' Coordination cost climbs by 1 every time
    // *this player* uses it (not their teammate), resetting each generation -- but each
    // card's own icon always shows its unescalated base cost, since that's baked into static
    // render data. Surface the actual current cost here so it's visible before confirming,
    // not just discovered by trying to pay and coming up short.
    const teamActionByCardName: Partial<Record<CardName, keyof TeamActionCosts>> = {
      [CardName.GIVE_PATENT]: 'givePatent',
      [CardName.FACILITY_SHARING]: 'facilitySharing',
      [CardName.TEAM_DONATION]: 'donation',
    };
    for (const card of standardProjects) {
      const action = teamActionByCardName[card.name];
      if (action !== undefined) {
        card.additionalProjectCosts = {
          ...card.additionalProjectCosts,
          conglomeratesCost: ConglomeratesExpansion.getTeamActionCost(this, action),
        };
      }
    }

    return new SelectStandardProjectToPlay(
      this,
      standardProjects,
      {
        enabled: standardProjects.map((card) => card.canAct(this)),
        title: 'Standard projects',
        buttonLabel: 'Confirm',
      });
  }

  // High Orbit (fan): Infrastructure cards are never dealt into hand or drawn from the project
  // deck (see GameCards.getProjectCards) -- they sit in a shared market (IGame.highOrbitMarket,
  // 3 rows of 5 slots) and any player may acquire a displayed card as a normal action, from
  // generation 1 onward, provided the design's own requirements are met. Buying a card locks
  // its whole row (no further purchases from that row, even its other slots) for the rest of
  // the generation -- see IGame.highOrbitMarket's doc comment and Game.startGeneration, which
  // unlocks every row and refills empty slots at the start of the next one.
  //
  // Cost is native Titanium (1-4), substitutable at 4 M€ per Titanium not spent -- a bespoke,
  // self-contained rate that must NOT go through the shared per-player getTitaniumValue()
  // system (normally 3), so payment is built directly from Payment.of() + player.pay() here
  // rather than reusing SelectPaymentDeferred's titanium handling. Planetary Outpost pays the
  // same way as every other design here -- its only documented exception is no Infrastructure
  // tag and no Space>Infrastructure requirement (see PlanetaryOutpost.ts).
  public getHighOrbitInfrastructureOptions(): Array<PlayerInput> {
    if (!this.game.gameOptions.highOrbitExpansion) {
      return [];
    }
    const result: Array<PlayerInput> = [];
    for (const row of this.game.highOrbitMarket) {
      if (row.locked) {
        continue;
      }
      for (let slotIndex = 0; slotIndex < row.slots.length; slotIndex++) {
        const cardName = row.slots[slotIndex];
        // A round-trip through JSON (game.save()/reload) turns an `undefined` array element
        // into `null` -- see the Black Market/MutationMarkets crashes this exact gotcha caused
        // before. Treat both as "empty slot" (can't use `== null` here: eqeqeq forbids it).
        if (cardName === undefined || cardName === null) {
          continue;
        }
        const card = newProjectCard(cardName);
        if (card === undefined || !card.canPlay(this)) {
          continue;
        }

        const minTitanium = Math.max(0, card.cost - Math.floor(this.megaCredits / 4));
        const maxTitanium = Math.min(card.cost, this.titanium);
        if (minTitanium > maxTitanium) {
          continue;
        }
        result.push(
          new SelectAmount(
            message('Acquire ${0}: spend how much titanium toward its ${1} titanium cost? (4 M€ per titanium not spent)', (b) => b.card(card).number(card.cost)),
            'Confirm',
            minTitanium,
            maxTitanium,
          ).andThen((titaniumSpent) => {
            const megacreditsDue = (card.cost - titaniumSpent) * 4;
            row.locked = true;
            row.slots[slotIndex] = undefined;
            this.playCard(card, Payment.of({megacredits: megacreditsDue, titanium: titaniumSpent}));
            return undefined;
          }),
        );
      }
    }
    return result;
  }

  private headStartIsInEffect() {
    if (this.game.phase === Phase.PRELUDES && this.playedCards.has(CardName.HEAD_START)) {
      if (this.actionsTakenThisRound < 2) {
        return true;
      }
    }
    return false;
  }

  /**
   * Set up a player taking their next action.
   *
   * This method indicates the avalilable actions by setting the `waitingFor` attribute of this player.
   *
   * saveBeforeTakingAction when true, the game state is saved. Default is `true`. This
   * should only be false in testing and when this method is called during game deserialization. In other
   * words, don't set this value unless you know what you're doing.
   */
  public takeAction(saveBeforeTakingAction: boolean = true): void {
    const game = this.game;

    if (game.deferredActions.length > 0) {
      game.deferredActions.runAll(() => this.takeAction());
      return;
    }

    if (game.additionalResearch !== undefined) {
      game.startAdditionalResearch();
      return;
    }

    if (saveBeforeTakingAction && (this.actionsTakenThisRound === 0 || game.gameOptions.undoOption)) {
      game.save();
    }


    // Autopass is disabled.
    // if (this.autopass) {
    //   this.passOption().cb();
    // }
    const headStartIsInEffect = this.headStartIsInEffect();
    this.game.inDoubleDown = false;

    if (!headStartIsInEffect) {
      // Prelude cards have to be played first
      if (this.preludeCardsInHand.length > 0) {
        game.phase = Phase.PRELUDES;

        const selectPrelude = PreludesExpansion.selectPreludeToPlay(this, this.preludeCardsInHand);

        this.setWaitingFor(selectPrelude, this.runWhenEmpty(() => {
          this.incrementActionsTaken();
          if (this.preludeCardsInHand.length === 0 && !this.headStartIsInEffect()) {
            game.playerIsFinishedTakingActions();
            return;
          }
          this.takeAction();
        }));

        return;
      }

      if (this.ceoCardsInHand.size > 0) {
        // The CEO phase occurs between the Prelude phase and before the Action phase.
        // All CEO cards are played before players take their first normal actions.
        game.phase = Phase.CEOS;

        // start from the end of the list and work backwards, not sure why.
        const playableCeoCards = Array.from(this.ceoCardsInHand).filter((card) => card.canPlay?.(this) === true).reverse();
        for (const ceo of playableCeoCards) {
          this.playCard(ceo);
        }
        // Null out ceoCardsInHand, anything left was unplayable.
        this.ceoCardsInHand.clear();
        this.takeAction(); // back to top
        return;
      } else {
        game.phase = Phase.ACTION;
      }

      if (game.hasPassedThisActionPhase(this) || (this.allOtherPlayersHavePassed() === false && this.actionsTakenThisRound >= this.availableActionsThisRound)) {
        this.actionsTakenThisRound = 0;
        // Management Crisis (Solaris, fan): once active for this generation, every future
        // turn this generation starts capped at 1 action instead of the usual 2.
        this.availableActionsThisRound = this.oneActionPerTurnActiveGeneration === game.generation ? 1 : 2;
        game.resettable = true;
        game.playerIsFinishedTakingActions();
        return;
      }
    }

    // Terraforming Mars FAQ says:
    //   If for any reason you are not able to perform your mandatory first action (e.g. if
    //   all 3 Awards are claimed before starting your turn as Vitor), you can skip this and
    //   proceed with other actions instead.
    // This code just uses "must skip" instead of "can skip".
    const vitor = this.tableau.get(CardName.VITOR);
    if (vitor !== undefined && this.game.allAwardsFunded()) {
      this.pendingInitialActions = this.pendingInitialActions.filter((card) => card !== vitor);
    }

    if (this.pendingInitialActions.length > 0) {
      const orOptions = new OrOptions();

      this.pendingInitialActions.forEach((corp) => {
        const option = new SelectOption(
          message('Take first action of ${0} corporation', (b) => b.card(corp)),
          corp.initialActionText)
          .andThen(() => {
            game.log('${0} took the first action of ${1} corporation', (b) => b.player(this).card(corp)),
            this.defer(corp.initialAction?.(this));
            inplaceRemove(this.pendingInitialActions, corp);
            return undefined;
          });
        orOptions.options.push(option);
      });

      if (!headStartIsInEffect) {
        orOptions.options.push(this.passOption());
      }

      this.setWaitingFor(orOptions, this.runWhenEmpty(() => {
        if (this.pendingInitialActions.length === 0) {
          this.incrementActionsTaken();
        }
        this.timer.rebate(constants.BONUS_SECONDS_PER_ACTION * 1000);
        this.takeAction();
      }));
      return;
    }

    this.setWaitingFor(this.getActions(), this.runWhenEmpty(() => {
      // Sistemas Seebeck (fan): a free conversion sets this instead of consuming an action.
      if (this.skipNextActionIncrement) {
        this.skipNextActionIncrement = false;
      } else {
        this.incrementActionsTaken();
      }
      this.takeAction();
    }));
  }

  private incrementActionsTaken(): void {
    const context = this.game.logActionContext;
    if (context?.actor === this) {
      const lastMessage = this.game.gameLog.findLast((message) => message.actionId === context.id);
      if (lastMessage !== undefined) {
        lastMessage.actionEnd = true;
      }
    }
    this.actionsTakenThisRound++;
    this.actionsTakenThisGame++;
  }

  public /* for testing */ getActions() {
    const action = new OrOptions()
      .setTitle(this.actionsTakenThisRound === 0 ? 'Take your first action' : 'Take your next action')
      .setButtonLabel('Take action');

    const claimableMilestones = this.claimableMilestones();
    if (claimableMilestones.length > 0) {
      const milestoneOption = new OrOptions().setTitle('Claim a milestone');
      milestoneOption.options = claimableMilestones.map(
        (milestone) => new SelectOption(milestone.name, 'Claim - ' + '('+ milestone.name + ')').andThen(() => {
          this.claimMilestone(milestone);
          return undefined;
        }));
      action.options.push(milestoneOption);
    }

    // Convert Plants
    const convertPlants = new ConvertPlants();
    if (convertPlants.canAct(this)) {
      action.options.push(convertPlants.action(this));
    }

    // Convert Heat. Vanilla Kelvinists kp03 swaps in a 6-heat variant in this slot -- a More
    // Parties game reuses the 'kp03' id for an unrelated policy, so this only applies outside
    // that expansion (see TurmoilHandler.partyAction for the reworked kp03's own action).
    if (!this.game.gameOptions.morePartiesExpansion && PartyHooks.shouldApplyPolicy(this, PartyName.KELVINISTS, 'kp03')) {
      if (KELVINISTS_POLICY_3.canAct(this)) {
        action.options.push(KELVINISTS_POLICY_3.action(this));
      }
    } else {
      const convertHeat = new ConvertHeat();
      if (convertHeat.canAct(this)) {
        const option = new SelectOption('Convert 8 heat into temperature', 'Convert heat').andThen(() => {
          return convertHeat.action(this);
        });
        if (convertHeat.warnings.size > 0) {
          option.warnings = Array.from(convertHeat.warnings);
          if (convertHeat.warnings.has('maxtemp')) {
            option.eligibleForDefault = false;
          }
        }
        action.options.push(option);
      }
    }

    // Sistemas Seebeck (fan): a free energy<->heat conversion - see SistemasSeebeck.buildFreeConvertAction.
    const seebeckConvert = SistemasSeebeck.buildFreeConvertAction(this);
    if (seebeckConvert !== undefined) {
      action.options.push(seebeckConvert);
    }

    // Turmoil
    const turmoilInput = TurmoilHandler.partyAction(this);
    if (turmoilInput !== undefined) {
      action.options.push(turmoilInput);
    }

    // Action cards
    if (this.getPlayableActionCards().length > 0) {
      action.options.push(this.playActionCard());
    }

    // CEO cards
    const ceoOpgAction = this.getPlayCeoOPGAction();
    if (ceoOpgAction !== undefined) {
      action.options.push(ceoOpgAction);
    }

    // Playable cards
    const playableCards = this.getPlayableCards();
    if (playableCards.length !== 0) {
      action.options.push(new SelectProjectCardToPlay(this, playableCards));
    }

    // Trade with colonies
    const coloniesTradeAction = this.colonies.coloniesTradeAction();
    if (coloniesTradeAction !== undefined) {
      action.options.push(coloniesTradeAction);
    }

    // Add delegates
    Turmoil.ifTurmoil(this.game, (turmoil) => {
      const input = turmoil.getSendDelegateInput(this);
      if (input !== undefined) {
        action.options.push(input);
      }
    });

    // End turn
    // Administrative Delay (idesOfMars, fan): lets this player end a turn with 0 actions
    // taken, without it counting as passing, for the rest of the generation it was played.
    const administrativeDelayInEffect = this.administrativeDelayActiveGeneration === this.game.generation;
    if (this.game.players.length > 1 &&
      (this.actionsTakenThisRound > 0 || administrativeDelayInEffect) &&
      !this.game.gameOptions.fastModeOption &&
      this.allOtherPlayersHavePassed() === false) {
      action.options.push(this.endTurnOption());
    }

    // Fund award
    const fundingCost = this.awardFundingCost();
    if (this.canAfford(fundingCost) && !this.game.allAwardsFunded()) {
      const remainingAwards = new OrOptions()
        .setTitle(message('Fund an award (${0} M€)', (b) => b.number(fundingCost)))
        .setButtonLabel('Confirm');
      remainingAwards.options = this.game.awards
        .filter((award: IAward) => this.game.hasBeenFunded(award) === false)
        .map((award: IAward) => this.fundAward(award));
      action.options.push(remainingAwards);
    }

    // Standard Projects -- Cloud City/Gas Mine/Floater Array (Venus Phase 2's own) are included
    // in this grouped list too now, via their own canPayWith({anyFloaters: true}).
    action.options.push(this.getStandardProjectOption());

    // High Orbit (fan): acquire an Infrastructure card from the shared supply.
    action.options.push(...this.getHighOrbitInfrastructureOptions());

    // Pass
    action.options.push(this.passOption());

    // Sell patents
    const sellPatents = new SellPatentsStandardProject();
    if (sellPatents.canAct(this)) {
      action.options.push(sellPatents.action(this));
    }

    if (this.game.players.length > 1 &&
      !this.game.botPlayerIds.has(this.id) &&
      !this.game.surrenderedPlayerIds.has(this.id) &&
      (getAutomationCompatibility(this.game.gameOptions).unsupportedFeatures.length === 0 ||
        isLastActivePlayerFinish(this.game.players.length, this.game.surrenderedPlayerIds.size + 1))) {
      action.options.push(this.surrenderOption());
    }

    // Propose undo action only if you have done one action this turn
    if (this.actionsTakenThisRound > 0 && this.game.gameOptions.undoOption) {
      action.options.push(new UndoActionOption());
    }

    return action;
  }

  private allOtherPlayersHavePassed(): boolean {
    const game = this.game;
    if (game.isSoloMode()) {
      return true;
    }
    const players = game.players;
    const passedPlayers = game.getPassedPlayers();
    return passedPlayers.length === players.length - 1 && passedPlayers.includes(this.color) === false;
  }

  public process(input: InputResponse): void {
    if (this.waitingFor === undefined || this.waitingForCb === undefined) {
      throw new Error('Not waiting for anything');
    }
    const waitingFor = this.waitingFor;
    const waitingForCb = this.waitingForCb;
    const game = this.game;
    const logStart = game.gameLog.length;
    const previousLogContext = game.logActionContext;
    if (game.phase === Phase.ACTION || game.phase === Phase.PRELUDES || game.phase === Phase.CEOS) {
      const id = `${game.generation}:${game.phase}:${this.color}:${this.actionsTakenThisGame}`;
      game.logActionContext = {
        id, actor: this, generation: game.generation, phase: game.phase,
        ordinal: this.actionsTakenThisGame,
        firstMessage: !game.gameLog.some((message) => message.actionId === id),
      };
    }
    this.waitingFor = undefined;
    this.waitingForCb = undefined;
    try {
      if (!waitingFor.optional) {
        this.timer.stop();
      }
      this.clearPendingTurnNoticeTimers();
      this.defer(waitingFor.process(input, this));
      waitingForCb();
      if (this.waitingFor === undefined) {
        void deleteTurnNotice(this);
        this._turnNoticeSentThisRound = false;
      }
    } catch (err) {
      for (const message of game.gameLog.slice(logStart)) {
        if (message.actionId === game.logActionContext?.id) {
          delete message.actionId;
          delete message.actionStart;
          delete message.actionEnd;
        }
      }
      this.setWaitingFor(waitingFor, waitingForCb);
      throw err;
    } finally {
      game.logActionContext = previousLogContext;
    }
  }

  public getWaitingFor(): PlayerInput | undefined {
    return this.waitingFor;
  }

  private getTurnNoticeKey(): string {
    const actionsBeforeThisTurn = Math.max(0, this.game.getActionCount() - this.actionsTakenThisRound);
    return `${this.game.id}:${this.game.generation}:${this.game.phase}:${this.id}:${actionsBeforeThisTurn}`;
  }

  private hasActiveTurnNotice(turnNoticeKey: string): boolean {
    return this.lastTurnNoticeKey === turnNoticeKey && this.lastNoticeMessageId >= 0;
  }

  private isTelegramTurnNoticeActionable(): boolean {
    if (this.game?.phase === Phase.INITIALDRAFTING || this.game?.phase === Phase.DRAFTING) {
      return this.needsToDraft === true;
    }
    return true;
  }

  private canSendTelegramTurnNotice(): boolean {
    return this.telegramID !== '' &&
      this.game?.gameOptions.turnBasedGame === true &&
      this.isTelegramTurnNoticeActionable();
  }

  private canSendTelegramTurnNoticeReminder(): boolean {
    return this.canSendTelegramTurnNotice();
  }

  private clearPendingTurnNoticeTimers(): void {
    if (this._pendingTurnNoticeTimer) {
      clearTimeout(this._pendingTurnNoticeTimer);
      this._pendingTurnNoticeTimer = undefined;
    }
    this.clearPendingTurnNoticeReminderTimer();
  }

  private clearPendingTurnNoticeReminderTimer(): void {
    if (this._pendingTurnNoticeReminderTimer) {
      clearTimeout(this._pendingTurnNoticeReminderTimer);
      this._pendingTurnNoticeReminderTimer = undefined;
    }
    this._pendingTurnNoticeReminderKey = undefined;
  }

  private scheduleTurnNoticeReminder(turnNoticeKey: string): void {
    const reminderMs = getTurnNoticeReminderMs();
    if (reminderMs === 0) {
      return;
    }
    if (!this.canSendTelegramTurnNoticeReminder()) {
      return;
    }
    if (!this.hasActiveTurnNotice(turnNoticeKey)) {
      return;
    }
    if (this._pendingTurnNoticeReminderTimer !== undefined) {
      if (this._pendingTurnNoticeReminderKey === turnNoticeKey) {
        return;
      }
      this.clearPendingTurnNoticeReminderTimer();
    }

    const storedNoticeUpdatedAt = getStoredTurnNoticeUpdatedAt(this, turnNoticeKey);
    const elapsedMs = storedNoticeUpdatedAt === undefined ? 0 : Math.max(0, Date.now() - storedNoticeUpdatedAt);
    const reminderDelayMs = Math.max(0, reminderMs - elapsedMs);

    this._pendingTurnNoticeReminderKey = turnNoticeKey;
    this._pendingTurnNoticeReminderTimer = setTimeout(() => {
      const scheduledKey = this._pendingTurnNoticeReminderKey;
      this._pendingTurnNoticeReminderTimer = undefined;
      this._pendingTurnNoticeReminderKey = undefined;
      if (scheduledKey !== undefined) {
        void this.sendTurnNoticeReminder(scheduledKey);
      }
    }, reminderDelayMs);
    unrefTimer(this._pendingTurnNoticeReminderTimer);
  }

  private async sendTurnNoticeReminder(turnNoticeKey: string): Promise<void> {
    if (!this.canSendTelegramTurnNoticeReminder()) {
      return;
    }
    if (this.waitingFor === undefined) {
      return;
    }
    if (this.getTurnNoticeKey() !== turnNoticeKey) {
      return;
    }
    if (!this.hasActiveTurnNotice(turnNoticeKey)) {
      return;
    }

    const previousMessageId = this.lastNoticeMessageId;
    const sent = await sendTurnNotice(this, turnNoticeKey, {reminder: true});
    if (sent) {
      this._turnNoticeSentThisRound = true;
      this.lastTurnReminderNoticeKey = turnNoticeKey;
      if (previousMessageId >= 0 && previousMessageId !== this.lastNoticeMessageId) {
        await deleteTurnNoticeMessage(this, previousMessageId);
      }
      this.scheduleTurnNoticeReminder(turnNoticeKey);
    }
  }

  public setWaitingFor(input: PlayerInput, cb: () => void = () => {}): void {
    const turnNoticeKey = this.getTurnNoticeKey();
    if (this.game.inputsThisRound === 0) {
      this._turnNoticeSentThisRound = this.hasActiveTurnNotice(turnNoticeKey);
    } else if (!this.hasActiveTurnNotice(turnNoticeKey)) {
      this._turnNoticeSentThisRound = false;
    }
    if (this.waitingFor !== undefined) {
      const message = `Overwriting waitingFor ${this.waitingFor.type} with ${input?.type}`;
      if (THROW_STATE_ERRORS) {
        throw new Error(message);
      } else {
        console.warn(message);
      }
    }
    if (!input.optional) {
      this.timer.start();
    }
    this.waitingFor = input;
    this.waitingForCb = cb;
    this.game.inputsThisRound++;
    if (this._pendingTurnNoticeTimer) {
      clearTimeout(this._pendingTurnNoticeTimer);
      this._pendingTurnNoticeTimer = undefined;
    }
    if (!this.isTelegramTurnNoticeActionable()) {
      if (this.hasActiveTurnNotice(turnNoticeKey)) {
        void deleteTurnNotice(this);
      }
      this._turnNoticeSentThisRound = false;
      return;
    }
    if (this.canSendTelegramTurnNotice() && this._turnNoticeSentThisRound === false) {
      this._pendingTurnNoticeTimer = setTimeout(async () => {
        this._pendingTurnNoticeTimer = undefined;
        const sent = await sendTurnNotice(this, turnNoticeKey);
        if (sent || this.hasActiveTurnNotice(turnNoticeKey)) {
          this._turnNoticeSentThisRound = true;
          this.scheduleTurnNoticeReminder(turnNoticeKey);
        }
      }, TURN_NOTICE_DELAY_MS);
      unrefTimer(this._pendingTurnNoticeTimer);
    } else {
      this.scheduleTurnNoticeReminder(turnNoticeKey);
    }
  }

  /**
   * A version of setWaitingFor that does not discard a setWaitingFor call whe
   * this player is already waiting for something. Instead, it modifies the
   * current waitingFor by wrapping it with behavior that calls the next setWaitingFor
   * when it finishes.
   *
   * This was only built for the Philares/Final Greenery case. Might not work elsewhere.
   */
  public setWaitingForSafely(input: PlayerInput, cb: () => void = () => {}): void {
    if (this.waitingFor === undefined) {
      this.setWaitingFor(input, cb);
    } else {
      const savedcb = this.waitingForCb;
      if (savedcb === undefined) {
        this.waitingForCb = cb;
      } else {
        this.waitingForCb = () => {
          savedcb();
          this.setWaitingForSafely(input, cb);
        };
      }
    }
  }

  public clearWaitingFor(): void {
    const waitingFor = this.waitingFor;
    this.waitingFor = undefined;
    this.waitingForCb = undefined;
    if (waitingFor !== undefined && !waitingFor.optional) {
      this.timer.stop();
    }
  }

  public serialize(): SerializedPlayer {
    const result: SerializedPlayer = {
      projectCardStates: {
        cardsInHand: serializeDynamicCards(this.cardsInHand),
        dealtProjectCards: serializeDynamicCards(this.dealtProjectCards),
        draftedCards: serializeDynamicCards(this.draftedCards),
        draftHand: serializeDynamicCards(this.draftHand),
        removedFromPlayCards: serializeDynamicCards(this.removedFromPlayCards),
      },
      id: this.id,
      user: this.user,
      telegramID: this.telegramID || undefined,
      lastNoticeMessageId: this.lastNoticeMessageId,
      lastTurnNoticeKey: this.lastTurnNoticeKey || undefined,
      lastTurnReminderNoticeKey: this.lastTurnReminderNoticeKey || undefined,
      // Used only during set-up
      pickedCorporationCard: this.pickedCorporationCard?.name,
      // Terraforming Rating
      terraformRating: this.terraformRating,
      hasIncreasedTerraformRatingThisGeneration: this.hasIncreasedTerraformRatingThisGeneration,
      // Resources
      megaCredits: this.megaCredits,
      megaCreditProduction: this.production.megacredits,
      steel: this.steel,
      steelProduction: this.production.steel,
      titanium: this.titanium,
      titaniumProduction: this.production.titanium,
      plants: this.plants,
      plantProduction: this.production.plants,
      energy: this.energy,
      energyProduction: this.production.energy,
      heat: this.heat,
      heatProduction: this.production.heat,
      // Resource values
      titaniumValue: this.titaniumValue,
      steelValue: this.steelValue,
      floaterValue: this.floaterValue,
      // Helion
      canUseHeatAsMegaCredits: this.canUseHeatAsMegaCredits,
      canUseEnergyAsMegaCredits: this.canUseEnergyAsMegaCredits,
      // Martian Lumber Corp
      canUsePlantsAsMegaCredits: this.canUsePlantsAsMegacredits,
      // Luna Trade Federation
      canUseTitaniumAsMegacredits: this.canUseTitaniumAsMegacredits,
      preservationProgram: this.preservationProgram,
      trThisGeneration: this.trThisGeneration,
      administrativeDelayActiveGeneration: this.administrativeDelayActiveGeneration,
      oneActionPerTurnActiveGeneration: this.oneActionPerTurnActiveGeneration,
      // This generation / this round
      actionsTakenThisRound: this.actionsTakenThisRound,
      availableActionsThisRound: this.availableActionsThisRound,
      actionsThisGeneration: Array.from(this.actionsThisGeneration),
      pendingInitialActions: this.pendingInitialActions.map(toName),
      // Cards
      dealtCorporationCards: this.dealtCorporationCards.map(toName),
      dealtPreludeCards: this.dealtPreludeCards.map(toName),
      dealtCeoCards: this.dealtCeoCards.map(toName),
      dealtProjectCards: this.dealtProjectCards.map(toName),
      cardsInHand: this.cardsInHand.map(toName),
      preludeCardsInHand: this.preludeCardsInHand.map(toName),
      ceoCardsInHand: Array.from(this.ceoCardsInHand).map(toName),
      playedCards: this.playedCards.serialize(),
      draftedCards: this.draftedCards.map(toName),
      researchPurchaseUndo: this.researchPurchaseUndo,
      cardCost: this.cardCost,
      needsToDraft: this.needsToDraft,
      cardDiscount: this.colonies.cardDiscount,
      // Colonies
      fleetSize: this.colonies.getFleetSize(),
      tradesThisGeneration: this.colonies.usedTradeFleets,
      colonyTradeOffset: this.colonies.tradeOffset,
      colonyTradeDiscount: this.colonies.tradeDiscount,
      colonyVictoryPoints: this.colonies.victoryPoints,
      // Turmoil
      turmoilPolicyActionUsed: this.turmoilPolicyActionUsed,
      politicalAgendasActionUsedCount: this.politicalAgendasActionUsedCount,
      hasTurmoilScienceTagBonus: this.hasTurmoilScienceTagBonus,
      oceanBonus: this.oceanBonus,
      // Custom cards
      // Leavitt Station.
      scienceTagCount: this.tags.extraScienceTags,
      plantTagCount: this.tags.extraPlantTags,
      jovianTagCount: this.tags.extraJovianTags,
      spaceTagCount: this.tags.extraSpaceTags,
      energyTagCount: this.tags.extraEnergyTags,
      wildTagCount: this.tags.extraWildTags,
      // Ecoline
      plantsNeededForGreenery: this.plantsNeededForGreenery,
      // Lawsuit
      removingPlayers: this.removingPlayers,
      warmongerCards: this.warmongerCards,
      industryTilesPlaced: this.industryTilesPlaced,
      // Playwrights
      removedFromPlayCards: this.removedFromPlayCards.map(toName),
      // Standard Technology: Underworld
      standardProjectsThisGeneration: Array.from(this.standardProjectsThisGeneration),
      withinDeflectionZone: this.withinDeflectionZone,

      name: this.name,
      color: this.color,
      beginner: this.beginner,
      handicap: this.handicap,
      preludeHandicap: this.preludeHandicap,
      timer: this.timer.serialize(),
      // Stats
      actionsTakenThisGame: this.actionsTakenThisGame,
      actionsTakenAtGenerationStart: this.actionsTakenAtGenerationStart,
      victoryPointsByGeneration: this.victoryPointsByGeneration,
      totalDelegatesPlaced: this.totalDelegatesPlaced,
      earlyGameStats: this.earlyGameStats,
      underworldData: this.underworldData,
      conglomeratesData: this.conglomeratesData,
      alliedParty: this._alliedParty,
      draftHand: this.draftHand.map(toName),
      autoPass: this.autopass,
      globalParameterSteps: this.globalParameterSteps,
    };

    if (this.lastCardPlayed !== undefined) {
      result.lastCardPlayed = this.lastCardPlayed;
    }
    if (this.lastGreeneryActionNumber !== undefined) {
      result.lastGreeneryActionNumber = this.lastGreeneryActionNumber;
    }
    if (this.nextResearchKeepMax !== undefined) {
      result.nextResearchKeepMax = this.nextResearchKeepMax;
    }
    result.deltaProject = this.deltaProjectData;
    result.epsilonDample = this.epsilonDampleData;
    return result;
  }

  public static deserialize(d: SerializedPlayer, options: {restoreTimerClock?: boolean} = {}): Player {
    const player = new Player(d.name, d.color, d.beginner, Number(d.handicap), d.id, normalizePreludeHandicap(d.preludeHandicap));

    player.actionsTakenThisGame = d.actionsTakenThisGame;
    player.actionsTakenAtGenerationStart = d.actionsTakenAtGenerationStart ?? 0;
    player.actionsThisGeneration = new Set(d.actionsThisGeneration);
    player.actionsTakenThisRound = d.actionsTakenThisRound;
    player.availableActionsThisRound = d.availableActionsThisRound ?? 2;
    player.canUseHeatAsMegaCredits = d.canUseHeatAsMegaCredits;
    player.canUseEnergyAsMegaCredits = d.canUseEnergyAsMegaCredits ?? false;
    player.canUsePlantsAsMegacredits = d.canUsePlantsAsMegaCredits;
    player.canUseTitaniumAsMegacredits = d.canUseTitaniumAsMegacredits;
    player.cardCost = d.cardCost;
    player.colonies.cardDiscount = d.cardDiscount;
    player.colonies.tradeDiscount = d.colonyTradeDiscount;
    player.colonies.tradeOffset = d.colonyTradeOffset;
    player.colonies.setFleetSize(d.fleetSize);
    player.colonies.victoryPoints = d.colonyVictoryPoints;
    player.victoryPointsByGeneration = d.victoryPointsByGeneration;
    player.energy = d.energy;
    player.hasIncreasedTerraformRatingThisGeneration = d.hasIncreasedTerraformRatingThisGeneration;
    player.hasTurmoilScienceTagBonus = d.hasTurmoilScienceTagBonus;
    player.heat = d.heat;
    player.lastCardPlayed = d.lastCardPlayed;
    player.lastGreeneryActionNumber = d.lastGreeneryActionNumber;
    player.nextResearchKeepMax = d.nextResearchKeepMax;
    player.standardProjectsThisGeneration = new Set(d.standardProjectsThisGeneration);
    player.megaCredits = d.megaCredits;
    player.needsToDraft = d.needsToDraft;
    player.oceanBonus = d.oceanBonus;
    player.plants = d.plants;
    player.plantsNeededForGreenery = d.plantsNeededForGreenery;
    player.production.override(Units.of({
      energy: d.energyProduction,
      heat: d.heatProduction,
      megacredits: d.megaCreditProduction,
      plants: d.plantProduction,
      steel: d.steelProduction,
      titanium: d.titaniumProduction,
    }));
    player.removingPlayers = d.removingPlayers;
    player.warmongerCards = d.warmongerCards ?? 0;
    player.industryTilesPlaced = d.industryTilesPlaced ?? 0;
    player.tags.extraScienceTags = d.scienceTagCount;
    player.tags.extraPlantTags = d.plantTagCount;
    player.tags.extraJovianTags = d.jovianTagCount ?? 0;
    player.tags.extraSpaceTags = d.spaceTagCount ?? 0;
    player.tags.extraEnergyTags = d.energyTagCount ?? 0;
    player.tags.extraWildTags = d.wildTagCount ?? 0;
    player.steel = d.steel;
    player.steelValue = d.steelValue;
    player.floaterValue = d.floaterValue ?? constants.FLOATERS_VALUE;
    player.terraformRating = d.terraformRating;
    player.titanium = d.titanium;
    player.titaniumValue = d.titaniumValue;
    player.totalDelegatesPlaced = d.totalDelegatesPlaced;
    player.earlyGameStats = d.earlyGameStats?.version === 1 ? d.earlyGameStats : {version: 1};
    player.colonies.usedTradeFleets = d.tradesThisGeneration;
    player.turmoilPolicyActionUsed = d.turmoilPolicyActionUsed;
    player.politicalAgendasActionUsedCount = d.politicalAgendasActionUsedCount;
    player.user = d.user;
    player.telegramID = d.telegramID ?? '';
    player.lastNoticeMessageId = d.lastNoticeMessageId ?? -1;
    player.lastTurnNoticeKey = d.lastTurnNoticeKey ?? '';
    player.lastTurnReminderNoticeKey = d.lastTurnReminderNoticeKey ?? '';

    // Rebuild removed from play cards (Playwrights, Odyssey)
    player.removedFromPlayCards = restoreDynamicCards(d.removedFromPlayCards, d.projectCardStates?.removedFromPlayCards);

    if (d.pickedCorporationCard !== undefined) {
      player.pickedCorporationCard = newCorporationCard(d.pickedCorporationCard);
    }

    player.pendingInitialActions = corporationCardsFromJSON(d.pendingInitialActions ?? []);
    player.dealtCorporationCards = corporationCardsFromJSON(d.dealtCorporationCards);
    player.dealtPreludeCards = preludesFromJSON(d.dealtPreludeCards);
    player.dealtCeoCards = ceosFromJSON(d.dealtCeoCards);
    player.dealtProjectCards = restoreDynamicCards(d.dealtProjectCards, d.projectCardStates?.dealtProjectCards);
    player.deltaProjectData = d.deltaProject;
    player.epsilonDampleData = d.epsilonDample;
    player.cardsInHand = restoreDynamicCards(d.cardsInHand, d.projectCardStates?.cardsInHand);
    // I don't like "as IPreludeCard" but this is pretty safe.
    player.preludeCardsInHand = cardsFromJSON(d.preludeCardsInHand) as Array<IPreludeCard>;
    player.ceoCardsInHand = new Set(ceosFromJSON(d.ceoCardsInHand));
    player.playedCards.deserialize(d.playedCards);
    player.draftedCards = restoreDynamicCards(d.draftedCards, d.projectCardStates?.draftedCards);
    player.researchPurchaseUndo = d.researchPurchaseUndo;
    player.autopass = d.autoPass ?? false;
    player.preservationProgram = d.preservationProgram ?? false;
    // TODO(kberg): remove ?? 0 by 2026-11-01
    player.trThisGeneration = d.trThisGeneration ?? 0;
    player.administrativeDelayActiveGeneration = d.administrativeDelayActiveGeneration;
    player.oneActionPerTurnActiveGeneration = d.oneActionPerTurnActiveGeneration;

    player.timer = Timer.deserialize(d.timer, options.restoreTimerClock);
    player.underworldData = d.underworldData;
    // Merge with defaults (not a plain ?? fallback) so an in-progress save from before
    // teamActionCosts moved to per-player data still gets a valid value for it.
    player.conglomeratesData = {...ConglomeratesExpansion.initializePlayer(), ...d.conglomeratesData};

    if (d.alliedParty !== undefined) {
      player._alliedParty = d.alliedParty;
    }

    player.draftHand = restoreDynamicCards(d.draftHand, d.projectCardStates?.draftHand);
    if (d.globalParameterSteps) {
      player.globalParameterSteps = {...DEFAULT_GLOBAL_PARAMETER_STEPS, ...d.globalParameterSteps};
    }
    player.withinDeflectionZone = d.withinDeflectionZone ?? false;
    return player;
  }

  /* Shorthand for deferring things */
  public defer(input: PlayerInput | undefined | void | (() => PlayerInput | undefined), priority: Priority = Priority.DEFAULT): void {
    if (input === undefined) {
      return;
    }
    const cb = typeof(input) === 'function' ? input : () => input;
    const action = new SimpleDeferredAction(this, cb, priority);
    this.game.defer(action);
  }

  public runWhenEmpty(cb: () => void): () => void {
    const f = () => {
      if (this.game.deferredActions.length === 0) {
        cb();
        return;
      }
      this.game.deferredActions.runAll(() => f());
    };
    return f;
  }
}
