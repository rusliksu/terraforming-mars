import type {AndOptionsModel, PlayerInputModel} from '@/common/models/PlayerInputModel';
import type {Message} from '@/common/logs/Message';
import {titleKey} from '@/client/wrybit/inputs/orOptionsShortLabels';

/** Recognizes our complete native trading prompt, preserving its child order. */
export function tradeInput(input: AndOptionsModel | undefined) {
  const [fee, colony] = input?.options ?? [];
  if (input?.options.length !== 2 || titleKey(input.title) !== 'Trade with a colony tile' ||
    fee?.type !== 'or' || titleKey(fee.title) !== 'Pay trade fee' || fee.options.length === 0 ||
    !fee.options.every((option) => option.type === 'option') || colony?.type !== 'colony' ||
    titleKey(colony.title) !== 'Select colony tile for trade') {
    return undefined;
  }
  return {fee, colony};
}

const FEE_TITLES = {'Pay ${0} M€': 'megacredits', 'Pay ${0} energy': 'energy', 'Pay ${0} titanium': 'titanium'} as const;
export const FEE_ICON = {megacredits: 'resources/megacredit.png', energy: 'resources/power.png',
  titanium: 'resources/titanium.png', other: 'resources/wild.png'};

/** Identifies only known native captions for an optional icon; amounts stay in the native title. */
export function feeKind(title: string | Message): keyof typeof FEE_ICON {
  const key = titleKey(title);
  return Object.hasOwn(FEE_TITLES, key) ? FEE_TITLES[key as keyof typeof FEE_TITLES] : 'other';
}

export function isTradeChild(input: AndOptionsModel | undefined, child: PlayerInputModel, kind: 'fee' | 'colony'): boolean {
  return tradeInput(input)?.[kind] === child;
}
