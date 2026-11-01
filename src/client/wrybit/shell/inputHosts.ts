import {InjectionKey, shallowRef, ShallowRef} from 'vue';

export type InputHosts = {
  target: ShallowRef<HTMLElement | undefined>;
  register(host: HTMLElement): void;
  unregister(host: HTMLElement): void;
};

export const INPUT_HOSTS: InjectionKey<InputHosts> = Symbol('player-input-hosts');

export function createInputHosts(): InputHosts {
  const target = shallowRef<HTMLElement>();
  return {
    target,
    register(host) {
      target.value = host;
    },
    unregister(host) {
      if (target.value === host) {
        target.value = undefined;
      }
    },
  };
}
