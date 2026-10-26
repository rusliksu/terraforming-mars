/** Presentation-only symbols and already supplied labels; no creation defaults or AI setup. */
export type SeatIconKind = 'human' | 'ai' | 'none';
export type GameSetupChip = {
  key: string;
  label: string;
  seatIcon?: SeatIconKind;
  iconClass?: string;
  capitalized?: boolean;
  statsHref?: string;
};
