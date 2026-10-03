/**
 * Per-game configuration of the global-parameter tracks (temperature, oxygen, oceans, Venus).
 *
 * The official game bakes these numbers in as constants in `constants.ts`. Custom boards may
 * stretch the tracks and move the bonus "bumps" around, so a game can carry an override here.
 * When absent, `DEFAULT_GLOBAL_PARAMETERS` (which reproduces the official numbers exactly) is
 * used, so existing games and tests are unaffected.
 */

/** A reward granted the first time a track's value reaches `value` while rising. */
export type ParameterBonus =
  /** Place an ocean tile (temperature 0°C on the standard track). */
  | {value: number, kind: 'ocean'}
  /** Raise the temperature one step (oxygen 8% on the standard track). */
  | {value: number, kind: 'temperature'}
  /** Gain `amount` heat production (temperature -24°C and -20°C on the standard track). */
  | {value: number, kind: 'heatProduction', amount: number}
  /** Draw `amount` cards (Venus 8 on the standard track). */
  | {value: number, kind: 'card', amount: number}
  /** Gain `amount` TR (Venus 16 on the standard track). */
  | {value: number, kind: 'tr', amount: number};

export type ParameterTrack = {
  min: number;
  max: number;
  /** Smallest increment of this parameter's value (temperature 2, oxygen 1, Venus 2). */
  step: number;
  bonuses: ReadonlyArray<ParameterBonus>;
};

export type GlobalParametersConfig = {
  temperature: ParameterTrack;
  oxygen: ParameterTrack;
  oceans: {max: number};
  venus: ParameterTrack;
  /** Heat spent by the "Convert heat" standard action to raise temperature. */
  heatForTemperature: number;
};

export const DEFAULT_GLOBAL_PARAMETERS: GlobalParametersConfig = {
  temperature: {
    min: -30,
    max: 8,
    step: 2,
    bonuses: [
      {value: -24, kind: 'heatProduction', amount: 1},
      {value: -20, kind: 'heatProduction', amount: 1},
      {value: 0, kind: 'ocean'},
    ],
  },
  oxygen: {
    min: 0,
    max: 14,
    step: 1,
    bonuses: [
      {value: 8, kind: 'temperature'},
    ],
  },
  oceans: {max: 9},
  venus: {
    min: 0,
    max: 30,
    step: 2,
    bonuses: [
      {value: 8, kind: 'card', amount: 1},
      {value: 16, kind: 'tr', amount: 1},
    ],
  },
  heatForTemperature: 8,
};
