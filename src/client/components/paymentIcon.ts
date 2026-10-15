import {SpendableResource} from '@/common/inputs/Spendable';

/** Returns the icon used by our payment resource controls. */
export function paymentIconClass(unit: SpendableResource): string {
  switch (unit) {
  case 'kuiperAsteroids': return 'resource_icon--asteroid';
  case 'lunaArchivesScience': return 'resource_icon--science';
  case 'spireScience': return 'resource_icon--science';
  case 'auroraiData': return 'resource_icon--auroraidata';
  case 'seeds': return 'resource_icon--seed';
  case 'nereidMicrobes': return 'resource_icon--microbes';
  case 'anyFloaters': return 'resource_icon--floaters';
  default: return 'resource_icon--' + unit;
  }
}
