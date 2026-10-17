import {computed, inject} from 'vue';
import type {Component, ComputedRef, InjectionKey} from 'vue';
import type {Payment} from '@/common/inputs/Payment';
import type {SpendableResource} from '@/common/inputs/Spendable';
import type {Ledger} from '@/client/components/PaymentLedger';
import type {Message} from '@/common/logs/Message';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {CardModel} from '@/common/models/CardModel';
import type {CardName} from '@/common/cards/CardName';
import type {AndOptionsModel, OrOptionsModel, SelectCardModel, SelectProjectCardToPlayModel, PlayerInputModel} from '@/common/models/PlayerInputModel';
import type {InputHosts} from '@/client/wrybit/shell/inputHosts';
import type {Color, ColorWithNeutral} from '@/common/Color';
import type {Warning} from '@/common/cards/Warning';
import type {Units} from '@/common/Units';
import type {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import type {HazardData} from '@/common/ares/AresData';
import type {AresGlobalParametersResponse} from '@/common/inputs/AresGlobalParametersResponse';
import type {ColonyModel} from '@/common/models/ColonyModel';
import type {PartyModel, TurmoilModel} from '@/common/models/TurmoilModel';
import type {PartyName} from '@/common/turmoil/PartyName';
import type {ColonyName} from '@/common/colonies/ColonyName';
import type {ColonyMetadata} from '@/common/colonies/ColonyMetadata';
import type {InputChoice} from '@/client/components/inputChoice';
import type {PartyCardDetails} from '@/client/components/turmoil/partyCardDetails';

export type CardSelectionBinding = {
  playerView: PlayerViewModel;
  playerinput: SelectCardModel;
  showtitle: boolean;
  showsave: boolean;
  orderedCards: ReadonlyArray<CardModel>;
  selected: CardModel | Array<CardModel>;
  count: number;
  canSave: boolean;
  single: boolean;
  optionalMany: boolean;
  showSelectAll: boolean;
  allSelected: boolean;
  buttonLabel: string | Message;
  warning: string | Message | undefined;
  warnings: ReadonlyArray<Warning> | undefined;
  owner(card: CardModel): {name: string, color: Color};
  robotCard(card: CardModel): CardModel | undefined;
  select(cards: CardModel | Array<CardModel>): void;
  toggleAll(): void;
  save(): void;
};

export type ProjectCardBinding = {
  playerView: PlayerViewModel;
  playerinput: SelectProjectCardToPlayModel;
  showtitle: boolean;
  cards: ReadonlyArray<CardModel>;
  card: CardModel | undefined;
  cardName: CardName | undefined;
  paymentHost: InputHosts;
  select(name: CardName): void;
};

export type OrOptionsBinding = {
  asTabs: boolean;
  playerView: PlayerViewModel;
  playerinput: OrOptionsModel;
  showtitle: boolean;
  showsave: boolean;
  displayedOptions: ReadonlyArray<PlayerInputModel>;
  selectedOption: PlayerInputModel | undefined;
  selectedIdx: number;
  selectedChoice: InputChoice | undefined;
  partyCards: ReadonlyArray<PartyCardDetails>;
  radioElementName: string;
  childHost: InputHosts;
  footerHost: InputHosts;
  select(option: PlayerInputModel): void;
  selectChoice(option: PlayerInputModel, choice: InputChoice): Promise<void>;
  chooseAndSave(option: PlayerInputModel): Promise<void>;
  showChildSaveButton(option: PlayerInputModel): boolean;
  registerLabel(index: number, element: HTMLElement | null): void;
  save(): void;
};

export type AndOptionsBinding = {
  playerView: PlayerViewModel;
  playerinput: AndOptionsModel;
  showtitle: boolean;
  showsave: boolean;
  childHosts: ReadonlyArray<InputHosts>;
  canSave: boolean;
  save(): void;
};

/** Data and commands of our permanent controller, never a component-instance proxy. */
export type PaymentFormBinding = {
  confirmation: {cost: number, order: ReadonlyArray<SpendableResource>, ledger: Ledger, payment: Payment, itemName?: string} | undefined;
  acceptOverpayment(): void;
  dismissOverpayment(): void;
  cost: number;
  order: ReadonlyArray<SpendableResource>;
  ledger: Ledger;
  payment: Readonly<Payment>;
  descriptions: Record<SpendableResource, string>;
  warning: string | Message | undefined;
  showsave: boolean;
  buttonLabel: string;
  total: number;
  totalClass: string;
  totalTitle: string;
  target(unit: SpendableResource): number;
  plusLimit(unit: SpendableResource): number;
  setValue(unit: SpendableResource, value: number): void;
  plus(unit: SpendableResource): void;
  minus(unit: SpendableResource): void;
  max(unit: SpendableResource): void;
  save(): void;
};

export type InputViewBinding<K extends PlayerInputModel['type']> = {
  playerView: PlayerViewModel;
  playerinput: Extract<PlayerInputModel, {type: K}>;
  showtitle: boolean;
  showsave: boolean;
  save(): void;
};
export type AmountBinding = InputViewBinding<'amount'> & {
  amount: number;
  select(amount: number): void;
};
export type DelegateBinding = InputViewBinding<'delegate'> & {
  selected: ColorWithNeutral | undefined;
  select(color: ColorWithNeutral): void;
};
export type ResourceBinding = InputViewBinding<'resource'> & {
  selected: Extract<PlayerInputModel, {type: 'resource'}>['include'][number] | undefined;
  canSave: boolean;
  select(unit: Extract<PlayerInputModel, {type: 'resource'}>['include'][number]): void;
};
export type UnitAmountsBinding<K extends 'resources' | 'productionToLose'> = InputViewBinding<K> & {
  units: Readonly<Units>;
  keys: ReadonlyArray<keyof Units>;
  warning?: string;
  select(unit: keyof Units, value: number): void;
  plus(unit: keyof Units): void;
  minus(unit: keyof Units): void;
};
export type PlayerChoiceBinding = InputViewBinding<'player'> & {
  selected: ColorWithNeutral | undefined;
  select(color: ColorWithNeutral): void;
};
export type GlobalEventBinding = InputViewBinding<'globalEvent'> & {
  selected: GlobalEventName | undefined;
  select(name: GlobalEventName): void;
};
export type UndergroundChoiceBinding = InputViewBinding<'claimedUndergroundToken'> & {
  selected: ReadonlyArray<number>;
  select(indices: Array<number>): void;
};
export type DeltaChoiceBinding = InputViewBinding<'deltaProject'> & {
  amount: number;
  select(amount: number): void;
  max(): void;
};
export type AresDelta = AresGlobalParametersResponse[keyof AresGlobalParametersResponse];
export type AresBinding = InputViewBinding<'aresGlobalParameters'> & {
  hazardData: HazardData;
  range: ReadonlyArray<AresDelta>;
  response: Readonly<AresGlobalParametersResponse>;
  select(field: keyof AresGlobalParametersResponse, delta: AresDelta): void;
};
export type SpaceBinding = InputViewBinding<'space'> & {
  automatic: boolean;
  anchor: HTMLElement | undefined;
  warning: string | undefined;
  accept(): void;
  dismiss(): void;
  hide(hide: boolean): void;
};
export type InitialSectionKey = 'corporation' | 'prelude' | 'ceo' | 'projects';
export type PartyCardBinding = {
  party: PartyModel;
  policyText: string | undefined;
  bonusText: string | undefined;
  selected: boolean;
  disabled: boolean;
};
export type PartyChoiceBinding = InputViewBinding<'party'> & {
  turmoil: TurmoilModel | undefined;
  cards: ReadonlyArray<PartyCardBinding>;
  selected: PartyName | undefined;
  select(party: PartyName): void;
};
export type ColonyChoiceBinding = InputViewBinding<'colony'> & {
  colonies: ReadonlyArray<{model: ColonyModel, metadata: ColonyMetadata}>;
  selected: ColonyName | undefined;
  canSave: boolean;
  select(name: ColonyName): void;
};
export type InitialCardsBinding = InputViewBinding<'initialCards'> & {
  sections: ReadonlyArray<{key: InitialSectionKey, title: string | Message, badge: string, done: boolean, host: InputHosts}>;
  aridorColonies: ReadonlyArray<ColonyModel> | undefined;
  starting: number | undefined;
  preludes: number | undefined;
  purchase: number | undefined;
  remaining: number | undefined;
  cardCost: number | undefined;
  purchasedCount: number;
  valid: boolean;
  warning: string | undefined;
};

export type InputPresentationBindings = {
  waitingFor: {playerView: PlayerViewModel, playerinput: PlayerInputModel, bodyHost: InputHosts, footerHost: InputHosts};
  paymentForm: PaymentFormBinding;
  projectCard: ProjectCardBinding;
  or: OrOptionsBinding;
  and: AndOptionsBinding;
  card: CardSelectionBinding;
  amount: AmountBinding;
  option: InputViewBinding<'option'>;
  delegate: DelegateBinding;
  resource: ResourceBinding;
  resources: UnitAmountsBinding<'resources'>;
  productionToLose: UnitAmountsBinding<'productionToLose'>;
  player: PlayerChoiceBinding;
  globalEvent: GlobalEventBinding;
  claimedUndergroundToken: UndergroundChoiceBinding;
  deltaProject: DeltaChoiceBinding;
  aresGlobalParameters: AresBinding;
  space: SpaceBinding;
  initialCards: InitialCardsBinding;
  party: PartyChoiceBinding;
  colony: ColonyChoiceBinding;
};

export type InputPresentationRegistry = {
  [K in keyof InputPresentationBindings]?: Component<{binding: InputPresentationBindings[K]}>;
};

export const INPUT_PRESENTATIONS: InjectionKey<ComputedRef<InputPresentationRegistry | undefined>> = Symbol('input-presentations');
export const INPUT_DEPTH: InjectionKey<number> = Symbol('input-depth');
export const INPUT_PRESENTATION_INTRO: InjectionKey<ComputedRef<boolean>> = Symbol('input-presentation-intro');
export const INPUT_FOOTER: InjectionKey<InputHosts['target']> = Symbol('input-footer');
export const ROOT_INPUT_FOOTER: InjectionKey<InputHosts['target']> = Symbol('root-input-footer');

export function useInputPresentation<K extends keyof InputPresentationBindings>(kind: K) {
  const presentations = inject(INPUT_PRESENTATIONS, undefined);
  return computed(() => presentations?.value?.[kind]);
}
