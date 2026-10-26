import {computed} from 'vue';
import type {WritableComputedRef} from 'vue';
import type {CreateGameModel} from '@/client/components/create/CreateGameModel';
import type {Expansion} from '@/common/cards/GameModule';

// Collections have their own commands; generic controls can only edit our scalar fields.
export type ScalarCreateField = keyof CreateGameModel;

export type CreateModelView = {
  readonly [K in keyof CreateGameModel]: CreateGameModel[K] extends Array<infer T> ? ReadonlyArray<Readonly<T>> :
    CreateGameModel[K] extends object ? Readonly<CreateGameModel[K]> : CreateGameModel[K]
};

export type ControlledCreateFields = {
  model: CreateModelView;
  setField<K extends ScalarCreateField>(field: K, value: CreateGameModel[K]): void;
  setExpansion(expansion: Expansion, enabled: boolean): void;
};

/** Resolve every edit against the current owner binding, never an earlier snapshot. */
export function useCreateFields(owner: () => ControlledCreateFields) {
  function field(key: ScalarCreateField): WritableComputedRef<any> {
    // Values are resolved against the current owner binding; collection views stay readonly.
    return computed({
      get: () => (owner().model as unknown as Record<string, unknown>)[key],
      set: (value) => owner().setField(key, value as never),
    });
  }
  function expansion(key: Expansion): WritableComputedRef<boolean> {
    return computed({get: () => owner().model.expansions[key], set: (enabled) => owner().setExpansion(key, enabled)});
  }
  return {field, expansion};
}
