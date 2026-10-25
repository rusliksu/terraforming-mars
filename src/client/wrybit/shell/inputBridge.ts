import {computed, inject, onBeforeUnmount, shallowRef, toRaw, watchEffect} from 'vue';
import type {ComputedRef, InjectionKey, ShallowRef} from 'vue';
import type {OrOptionsBinding, ProjectCardBinding} from '@/client/wrybit/inputs/presentation';

type Registration<T> = {owner: symbol, binding: ComputedRef<T>};
type InputBridge = {
  or: ShallowRef<Registration<OrOptionsBinding> | undefined>;
  projectCard: ShallowRef<Registration<ProjectCardBinding> | undefined>;
};
export const INPUT_BRIDGE: InjectionKey<InputBridge> = Symbol('wrybit-input-bridge');

/** Only typed views of the permanent native controller cross the Teleport boundary. */
export function createInputBridge(): InputBridge {
  return {or: shallowRef(), projectCard: shallowRef()};
}

export function registerRootOr(binding: ComputedRef<OrOptionsBinding>): void {
  const bridge = inject(INPUT_BRIDGE, undefined);
  const owner = Symbol('root-or-view');
  watchEffect(() => {
    if (bridge === undefined) {
      return;
    }
    if (toRaw(binding.value.playerinput) === toRaw(binding.value.playerView.waitingFor)) {
      bridge.or.value = {owner, binding};
    } else if (bridge.or.value?.owner === owner) {
      bridge.or.value = undefined;
    }
  });
  onBeforeUnmount(() => {
    if (bridge?.or.value?.owner === owner) {
      bridge.or.value = undefined;
    }
  });
}

export function registerProjectCard(binding: ComputedRef<ProjectCardBinding>): void {
  const bridge = inject(INPUT_BRIDGE, undefined);
  const owner = Symbol('project-card-view');
  if (bridge !== undefined) {
    bridge.projectCard.value = {owner, binding};
  }
  onBeforeUnmount(() => {
    if (bridge?.projectCard.value?.owner === owner) {
      bridge.projectCard.value = undefined;
    }
  });
}

export function useInputBridge() {
  const bridge = inject(INPUT_BRIDGE, undefined);
  return {
    or: computed(() => bridge?.or.value?.binding.value),
    projectCard: computed(() => bridge?.projectCard.value?.binding.value),
  };
}
