import {inject, onBeforeUnmount, shallowRef} from 'vue';
import type {ComputedRef, InjectionKey, ShallowRef} from 'vue';
import type {AndOptionsModel} from '@/common/models/PlayerInputModel';
import type {ColonyChoiceBinding, OrOptionsBinding} from './presentation';

type ChildBindings = {or: OrOptionsBinding, colony: ColonyChoiceBinding};
type CompositePresentation = {
  input: ComputedRef<AndOptionsModel>;
  views: {[K in keyof ChildBindings]: ShallowRef<ComputedRef<ChildBindings[K]> | undefined>};
};

export const COMPOSITE_PRESENTATION: InjectionKey<CompositePresentation> = Symbol('composite-presentation');

/** Read-only child views beneath one permanent native And owner. */
export function createCompositePresentation(input: ComputedRef<AndOptionsModel>): CompositePresentation {
  return {input, views: {or: shallowRef(), colony: shallowRef()}};
}

/** Registers a child binding without copying its native selection or commands. */
export function registerCompositeView<K extends keyof ChildBindings>(kind: K, binding: ComputedRef<ChildBindings[K]>) {
  const parent = inject(COMPOSITE_PRESENTATION, undefined);
  if (parent !== undefined) {
    const target = parent.views[kind];
    target.value = binding;
    onBeforeUnmount(() => {
      if (target.value === binding) {
        target.value = undefined;
      }
    });
  }
  return parent;
}
