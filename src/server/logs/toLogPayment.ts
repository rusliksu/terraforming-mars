import {Payment} from '@/common/inputs/Payment';
import {SPENDABLE_RESOURCES} from '@/common/inputs/Spendable';
import {LogPayment} from '@/common/logs/LogMessage';

/** Returns a complete public expense only when every spent resource can be displayed. */
export function toLogPayment(payment: Readonly<Payment>, energy: number = 0): LogPayment | undefined {
  if (!Number.isSafeInteger(energy) || energy < 0 || !SPENDABLE_RESOURCES.every((resource) => {
    const amount = payment[resource];
    return Number.isSafeInteger(amount) && amount >= 0 &&
      (resource === 'megacredits' || resource === 'steel' || resource === 'titanium' || amount === 0);
  })) {
    return undefined;
  }

  const {megacredits, steel, titanium} = payment;
  const total = megacredits + steel + titanium + energy;
  if (!Number.isSafeInteger(total) || total === 0) {
    return undefined;
  }
  return {megacredits, steel, titanium, ...(energy > 0 ? {energy} : {})};
}
