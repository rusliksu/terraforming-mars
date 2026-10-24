// Adapted from Wrybit colonyView.ts; every benefit comes from our colony manifest.
import {getColonyOrThrow} from '@/client/colonies/ClientColonyManifest';
import type {ColonyModel} from '@/common/models/ColonyModel';
import type {ColonyMetadata} from '@/common/colonies/ColonyMetadata';
import {ColonyBenefit} from '@/common/colonies/ColonyBenefit';
import {Resource} from '@/common/Resource';
import {planetTone} from '@/client/wrybit/inputs/colony/planetAppearance';

export type BenefitIcon = {src?: string, label?: string, production: boolean};
const RESOURCE_ICON: Record<Resource, string> = {
  megacredits: 'resources/megacredit.png', steel: 'resources/steel.png', titanium: 'resources/titanium.png',
  plants: 'resources/plant.png', energy: 'resources/power.png', heat: 'resources/heat.png',
};

/** Describes the resource at the current native track position. */
export function benefitIcon(metadata: ColonyMetadata, position: number): BenefitIcon {
  const entry = metadata.trade;
  const resource = Array.isArray(entry.resource) ? entry.resource[position] : entry.resource;
  const production = entry.type === ColonyBenefit.GAIN_PRODUCTION;
  switch (entry.type) {
  case ColonyBenefit.GAIN_RESOURCES:
  case ColonyBenefit.STEAL_RESOURCES:
  case ColonyBenefit.LOSE_RESOURCES:
  case ColonyBenefit.GAIN_PRODUCTION:
    return {src: resource === undefined ? 'resources/wild.png' : RESOURCE_ICON[resource], production};
  case ColonyBenefit.ADD_RESOURCES_TO_CARD:
  case ColonyBenefit.ADD_RESOURCES_TO_VENUS_CARD:
    return {src: metadata.cardResource === undefined ? 'resources/wild.png' :
      'resources/' + metadata.cardResource.toLowerCase().replaceAll(' ', '-') + '.png', production};
  case ColonyBenefit.DRAW_CARDS:
  case ColonyBenefit.DRAW_CARDS_AND_BUY_ONE:
  case ColonyBenefit.DRAW_CARDS_AND_DISCARD_ONE:
  case ColonyBenefit.DRAW_CARDS_AND_KEEP_ONE:
  case ColonyBenefit.DRAW_EARTH_CARD:
    return {src: 'resources/card.png', production};
  case ColonyBenefit.GAIN_TR:
    return {src: 'resources/tr.png', production};
  case ColonyBenefit.GAIN_VP:
    return {label: 'VP', production};
  case ColonyBenefit.INCREASE_VENUS_SCALE:
    return {src: 'global-parameters/venus.png', production};
  case ColonyBenefit.PLACE_DELEGATES:
  case ColonyBenefit.GAIN_INFLUENCE:
    return {src: 'misc/delegate.png', production};
  default:
    return {src: 'resources/wild.png', production};
  }
}

export function colonyView(model: ColonyModel) {
  const metadata = getColonyOrThrow(model.name);
  return {model, metadata, tone: planetTone(model.name), tradeValue: metadata.trade.quantity[model.trackPosition],
    tradeIcon: benefitIcon(metadata, model.trackPosition),
    cells: metadata.trade.quantity.map((value, index) => ({value, index,
      slot: index < metadata.build.quantity.length,
      owner: index < metadata.build.quantity.length ? model.colonies[index] : undefined}))};
}

export type ColonyView = ReturnType<typeof colonyView>;
