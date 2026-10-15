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

export type CardSelectionBinding = {
  playerView: PlayerViewModel;
  playerinput: SelectCardModel;
  showtitle: boolean;
  showsave: boolean;
  orderedCards: ReadonlyArray<CardModel>;
  selected: CardModel | Array<CardModel>;
  count: number;
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
  radioElementName: string;
  childHost: InputHosts;
  footerHost: InputHosts;
  select(option: PlayerInputModel): void;
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
  anchor: HTMLElement | undefined;
  warning: string | undefined;
  accept(): void;
  dismiss(): void;
  hide(hide: boolean): void;
};

export type InputPresentationBindings = {
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
};

export type InputPresentationRegistry = {
  [K in keyof InputPresentationBindings]?: Component<{binding: InputPresentationBindings[K]}>;
};

export const INPUT_PRESENTATIONS: InjectionKey<ComputedRef<InputPresentationRegistry | undefined>> = Symbol('input-presentations');
export const INPUT_DEPTH: InjectionKey<number> = Symbol('input-depth');
export const INPUT_FOOTER: InjectionKey<InputHosts['target']> = Symbol('input-footer');

export function useInputPresentation<K extends keyof InputPresentationBindings>(kind: K) {
  const presentations = inject(INPUT_PRESENTATIONS, undefined);
  return computed(() => presentations?.value?.[kind]);
}
