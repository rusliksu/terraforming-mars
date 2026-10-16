import type {SeatIconKind} from '@/client/wrybit/visuals/common/gameSetupChipTypes';

// Source presentation options only; game choices and AI configuration come from our owner.
export type SegmentOption = {
  value: string | number;
  label: string;
  icon?: SeatIconKind;
  disabled?: boolean;
};
