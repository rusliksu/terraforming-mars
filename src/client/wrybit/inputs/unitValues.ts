import {computed} from 'vue';
import type {WritableComputedRef} from 'vue';
import type {Units} from '@/common/Units';

/** Writable view refs forward Vue's .number edits to the permanent controller. */
export function useUnitValues(binding: () => {units: Readonly<Units>, select(unit: keyof Units, value: number): void}) {
  const values = new Map<keyof Units, WritableComputedRef<number>>();
  return (unit: keyof Units): WritableComputedRef<number> => {
    let value = values.get(unit);
    if (value === undefined) {
      value = computed({get: () => binding().units[unit], set: (amount) => binding().select(unit, amount)});
      values.set(unit, value);
    }
    return value;
  };
}
