import {GlobalParametersConfig, ParameterBonus} from '@/common/GlobalParameterConfig';
import {BONUS_ICON, TrackBonus} from '@/client/wrybit/visuals/trackBonus/trackBonus';
import {MARS_SCALE_CELLS} from './marsScaleCells';

export type MarsScale = 'temperature' | 'oxygen' | 'venus';
export type ScaleBonusPin = {
  key: string;
  scale: MarsScale;
  value: number;
  bonus: TrackBonus;
  done: boolean;
  top?: number;
  left?: number;
  angle: number;
};

function bonusPresentation(bonus: ParameterBonus): TrackBonus {
  switch (bonus.kind) {
  case 'ocean': return {icons: [BONUS_ICON.ocean]};
  case 'temperature': return {icons: [BONUS_ICON.temperature]};
  case 'heatProduction': return {icons: [BONUS_ICON.heat], production: true, count: bonus.amount};
  case 'card': return {icons: [BONUS_ICON.card], count: bonus.amount};
  case 'tr': return {icons: [BONUS_ICON.tr], count: bonus.amount};
  }
}

/** Presents the supplied track rewards at the painted scale coordinates, or in a labelled list. */
export function scaleBonusPins(parameters: GlobalParametersConfig, values: Partial<Record<MarsScale, number>>, plainLayout: boolean): Array<ScaleBonusPin> {
  const pins: Array<ScaleBonusPin> = [];
  for (const scale of ['temperature', 'oxygen', 'venus'] as const) {
    const current = values[scale];
    if (current === undefined) {
      continue;
    }
    parameters[scale].bonuses.forEach((bonus, index) => {
      const cell = plainLayout ? undefined : MARS_SCALE_CELLS[scale][bonus.value];
      const pin: ScaleBonusPin = {
        key: `${scale}-${bonus.value}-${index}`, scale, value: bonus.value,
        bonus: bonusPresentation(bonus), done: current >= bonus.value, angle: 0,
      };
      if (cell !== undefined) {
        const centerX = cell[1] + 13;
        const centerY = cell[0] + 13;
        const dx = centerX - 298;
        const dy = centerY - 294;
        const distance = Math.hypot(dx, dy);
        pin.top = centerY + dy / distance * 16;
        pin.left = centerX + dx / distance * 16;
        pin.angle = Math.atan2(-dy, -dx) * 180 / Math.PI;
      }
      pins.push(pin);
    });
  }
  return pins;
}
