import {computed, inject} from 'vue';
import type {Component, ComputedRef, InjectionKey} from 'vue';
import type {ControlledCreateFields} from './controlledFields';
import type {InputHosts} from '@/client/wrybit/shell/inputHosts';
import type {BoardNameType} from '@/common/game/NewGameConfig';
import type {ValidationErrors} from '@/common/game/validateNewGameConfig';
import type PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import type SeatIcon from '@/client/wrybit/visuals/common/SeatIcon.vue';
import type NumberStepper from './NumberStepper.vue';
import type SwitchInput from './SwitchInput.vue';
import type ModuleItemFilter from './ModuleItemFilter.vue';
import type {CardName} from '@/common/cards/CardName';
import type {BoardName} from '@/common/boards/BoardName';
import type {SpaceModel} from '@/common/models/SpaceModel';
import type {GlobalParametersConfig} from '@/common/GlobalParameterConfig';

export type CreationBoardPreview = {
  data?: {boardName: BoardName, spaces: ReadonlyArray<SpaceModel>, customBoardRows?: number, globalParameters?: GlobalParametersConfig, randomExample: boolean};
  loading: boolean;
  error?: string;
  showBoardName: boolean;
  canRedraw: boolean;
  redraw(): void;
};

export type CustomListKind = 'corporations' | 'preludes' | 'ceos';
export type CustomListBinding = {
  kind: CustomListKind;
  title: string;
  selected: ReadonlyArray<CardName>;
  baseline: ReadonlyArray<CardName>;
  host: InputHosts;
};
export type CreateEditor = 'players' | 'mars' | 'moon' | 'venus' | CustomListKind | 'colonies' | 'banned' | 'included';
export type CreatePresentationBinding = ControlledCreateFields & {
  hosts: Record<CreateEditor, InputHosts>;
  customLists: ReadonlyArray<CustomListBinding>;
  boards: ReadonlyArray<BoardNameType>;
  wikiUrls: Readonly<Record<string, string>>;
  boardClass(board: BoardNameType): string;
  boardHref(board: BoardNameType): string;
  agendasEnabled: boolean;
  toggleAgendas(): void;
  hasValidationProblems: boolean;
  hasBlockingValidationErrors: boolean;
  validationErrors: ValidationErrors;
  showValidation(): void;
  importSettings(): void;
  exportSettings(): void;
  reset(): void;
  create(): void;
  clearCustomLists(): void;
  boardPreview?: CreationBoardPreview;
};

export type CreatePresentation = Component<{binding: CreatePresentationBinding}>;
export type CreateControls = {cube: typeof PlayerCube, seat: typeof SeatIcon, stepper: typeof NumberStepper, toggle: typeof SwitchInput, moduleFilter?: typeof ModuleItemFilter};
export const CREATE_PRESENTATION: InjectionKey<ComputedRef<CreatePresentation | undefined>> = Symbol('create-presentation');
export const CREATE_CONTROLS: InjectionKey<ComputedRef<CreateControls | undefined>> = Symbol('create-controls');
export function useCreatePresentation() {
  const view = inject(CREATE_PRESENTATION, undefined);
  return computed(() => view?.value);
}

export function useCreateControls() {
  const controls = inject(CREATE_CONTROLS, undefined);
  return computed(() => controls?.value);
}
