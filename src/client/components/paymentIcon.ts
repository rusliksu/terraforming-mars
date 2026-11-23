import {SpendableResource} from '@/common/inputs/Spendable';

/** Returns the icon used by our payment resource controls. */
export function paymentIconClass(unit: SpendableResource): string {
  switch (unit) {
  case 'kuiperAsteroids': return 'resource-icon--asteroid';
  case 'lunaArchivesScience': return 'resource-icon--science';
  case 'spireScience': return 'resource-icon--science';
  case 'auroraiData': return 'resource-icon--auroraidata';
  case 'seeds': return 'resource-icon--seed';
  case 'nereidMicrobes': return 'resource-icon--microbes';
  case 'anyFloaters': return 'resource-icon--floaters';
  default: return 'resource-icon--' + unit;
  }
}
