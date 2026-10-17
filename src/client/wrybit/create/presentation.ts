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

export type CreateEditor = 'players' | 'mars' | 'moon' | 'venus' | 'filters';
export type CreatePresentationBinding = ControlledCreateFields & {
  hosts: Record<CreateEditor, InputHosts>;
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
};

export type CreatePresentation = Component<{binding: CreatePresentationBinding}>;
export type CreateControls = {cube: typeof PlayerCube, seat: typeof SeatIcon, stepper: typeof NumberStepper, toggle: typeof SwitchInput};
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
