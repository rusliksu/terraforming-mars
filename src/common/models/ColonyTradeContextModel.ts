import {ColonyName} from '@/common/colonies/ColonyName';
import {Resource} from '@/common/Resource';

/** Own-player inputs for conditional stock-funded colony trade planning. */
export type ColonyTradeContextModel = {
  version: 1;
  /** Remaining action slots, including an unresolved current action. */
  remainingActionsThisTurn: number;
  allOpponentsPassed: boolean;
  tradeAvailable: boolean;
  tradeOffset: number;
  tradeBonusMC: number;
  payments: ReadonlyArray<{
    resource: 'energy' | 'titanium' | 'megacredits';
    amount: number;
    available: boolean;
  }>;
  stockColonies: ReadonlyArray<{
    name: ColonyName;
    tradeResource: Resource;
    tradeAmounts: ReadonlyArray<number>;
    ownBonus: {resource: Resource; amount: number};
  }>;
  ordinaryProduction: boolean;
  additionalPaymentMechanism: boolean;
  nextGenerationTradeAccess: 'normal' | 'blocked' | 'unknown';
  gameCanContinue: boolean;
};

/** Activation baseline and resolved choices for a multi-tile HIGH/LOW action. */
export type ColonyTrackChoiceModel = {
  version: 1;
  currentColony: ColonyName;
  colonies: ReadonlyArray<{
    name: ColonyName;
    originalTrackPosition: number;
    choice: 'pending' | 'high' | 'low';
  }>;
};
