import type {ComputedRef, InjectionKey} from 'vue';

export type UndoMode = 'action' | 'step' | 'research';
export type UndoPresentation = {
  actions: ReadonlyArray<{mode: UndoMode, title: string}>;
  run(mode: UndoMode): void;
};

export const WAITING_UNDO: InjectionKey<ComputedRef<UndoPresentation>> = Symbol('waiting-undo-presentation');
