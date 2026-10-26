import {PublicPlayerModel, ViewModel} from '@/common/models/PlayerModel';
import {buildTagDetails as canonicalTagDetails, TagDetails as CanonicalTagDetails} from '@/client/components/overview/playerTagDetails';
import {DiscountSource, getConditionalDiscounts} from './discounts';

export {TAG_ORDER, isTagInGame, isVictoryPointCountHidden} from '@/client/components/overview/playerTagDetails';
export type {InterfaceTagsType, TagDetail} from '@/client/components/overview/playerTagDetails';
export type TagDetails = CanonicalTagDetails & {conditionalDiscounts: ReadonlyArray<DiscountSource>};

export function buildTagDetails(player: PublicPlayerModel, view: ViewModel): TagDetails {
  return {...canonicalTagDetails(player, view), conditionalDiscounts: getConditionalDiscounts(player)};
}

export function handDiscountLabel(details: TagDetails): string {
  const asterisk = details.conditionalDiscounts.length > 0 ? '*' : '';
  return details.all.discount > 0 ? `-${details.all.discount}${asterisk}` : asterisk;
}
