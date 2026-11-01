import {DEFAULT_GLOBAL_PARAMETERS, GlobalParametersConfig} from '@/common/GlobalParameterConfig';

export type ParameterBonus = {at: number, percent: number, kind: string, title: string, amount?: number};
export type ParameterBar = {
  key: 'temperature' | 'oxygen' | 'oceans' | 'venus';
  label: string; icon: string; min: number; max: number; value: number;
  percent: number; text: string; done: boolean; steps: number; bonuses: ReadonlyArray<ParameterBonus>;
};
type Levels = {temperature: number, oxygen: number, oceans: number, venus?: number};
const TITLES = {temperature: 'Temperature', oxygen: 'Oxygen', oceans: 'Oceans', venus: 'Venus'};
const BONUS_TITLES = {heatProduction: 'Heat', ocean: 'Ocean', temperature: 'Temperature', card: 'Cards', tr: 'Terraform Rating'};

/** Source bar geometry over our configured tracks, including custom bonus values. */
export function parameterBars(levels: Levels, parameters: GlobalParametersConfig = DEFAULT_GLOBAL_PARAMETERS): Array<ParameterBar> {
  return (['temperature', 'oxygen', 'oceans', 'venus'] as const).flatMap((key) => {
    const value = levels[key];
    if (value === undefined) {
      return [];
    }
    const track = key === 'oceans' ? {...parameters.oceans, min: 0, step: 1, bonuses: []} : parameters[key];
    const percent = (at: number) => Math.max(0, Math.min(100, (at - track.min) / (track.max - track.min) * 100));
    return [{key, label: TITLES[key], icon: key === 'oceans' ? 'assets/tiles/ocean.png' : `assets/global-parameters/${key}.png`,
      min: track.min, max: track.max, value, percent: percent(value), done: value >= track.max,
      steps: Math.round((track.max - track.min) / track.step),
      text: key === 'temperature' ? `${value} °C` : key === 'oceans' ? `${value}/${track.max}` : `${value} %`,
      bonuses: track.bonuses.map((bonus) => ({at: bonus.value, percent: percent(bonus.value),
        kind: bonus.kind === 'heatProduction' ? 'heat' : bonus.kind, title: BONUS_TITLES[bonus.kind],
        amount: 'amount' in bonus ? bonus.amount : undefined}))}];
  });
}
