import {computed} from 'vue';
import type {WritableComputedRef} from 'vue';
import type {CreateGameModel} from '@/client/components/create/CreateGameModel';
import type {Expansion} from '@/common/cards/GameModule';

// Collections have their own commands; generic controls can only edit our scalar fields.
export type ScalarCreateField = {
  [K in keyof CreateGameModel]: Exclude<CreateGameModel[K], undefined> extends string | number | boolean ? K : never
}[keyof CreateGameModel];

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
  function field<K extends ScalarCreateField>(key: K): WritableComputedRef<CreateGameModel[K]> {
    // This key is restricted to scalar fields; collection views stay readonly.
    return computed({get: () => owner().model[key] as CreateGameModel[K], set: (value) => owner().setField(key, value)});
  }
  function expansion(key: Expansion): WritableComputedRef<boolean> {
    return computed({get: () => owner().model.expansions[key], set: (enabled) => owner().setExpansion(key, enabled)});
  }
  return {field, expansion};
}
