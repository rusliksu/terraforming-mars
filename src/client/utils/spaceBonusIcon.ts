import {SpaceBonus} from '@/common/boards/SpaceBonus';

// Mirrors the bonus->icon mapping baked into MapEditor.vue's BONUS_TOOLS palette (board.less
// defines the actual `.board-space-bonus--<suffix>` sprites) -- kept here too so other
// non-interactive renderers (e.g. MapThumbnail.vue) don't need to pull in the whole editor.
const SPACE_BONUS_CSS: Partial<Record<SpaceBonus, string>> = {
  [SpaceBonus.MEGACREDITS]: 'megacredit',
  [SpaceBonus.PLANT]: 'plant',
  [SpaceBonus.STEEL]: 'steel',
  [SpaceBonus.TITANIUM]: 'titanium',
  [SpaceBonus.DRAW_CARD]: 'card',
  [SpaceBonus.HEAT]: 'heat',
  [SpaceBonus.ENERGY]: 'energy',
  [SpaceBonus.MICROBE]: 'microbe',
  [SpaceBonus.ANIMAL]: 'animal',
  [SpaceBonus.DATA]: 'data',
  [SpaceBonus.SCIENCE]: 'science',
  [SpaceBonus.ENERGY_PRODUCTION]: 'energy-production',
  [SpaceBonus.DELEGATE]: 'delegate',
  [SpaceBonus.OCEAN]: 'bonusocean',
  [SpaceBonus.TEMPERATURE]: 'bonustemperature',
  [SpaceBonus.TEMPERATURE_4MC]: 'bonustemperature4mc',
  [SpaceBonus.COLONY]: 'colony',
  [SpaceBonus.ASTEROID]: 'asteroid',
  [SpaceBonus.FLOATER]: 'floater',
};

/** CSS suffix for `.board-space-bonus--<suffix>` (board.less), or '' if unrecognized. */
export function spaceBonusCss(bonus: SpaceBonus): string {
  return SPACE_BONUS_CSS[bonus] ?? '';
}

export interface GroupedSpaceBonus {
  bonus: SpaceBonus;
  count: number;
}

/**
 * Collapses a space's stacked bonuses for display: repeated MEGACREDITS bonuses collapse
 * into a single coin icon carrying a count (mirrors how card icons show "x2" etc.) instead
 * of one icon per stacked M€, while every other bonus type still renders one icon per
 * instance. Used by both Bonus.vue (real board/game rendering) and MapEditor.vue (the paint
 * canvas) so the two stay visually consistent.
 */
export function groupSpaceBonuses(bonus: Array<SpaceBonus>): Array<GroupedSpaceBonus> {
  const result: Array<GroupedSpaceBonus> = [];
  let megacreditIndex = -1;
  for (const b of bonus) {
    if (b === SpaceBonus.MEGACREDITS) {
      if (megacreditIndex === -1) {
        megacreditIndex = result.length;
        result.push({bonus: b, count: 1});
      } else {
        result[megacreditIndex].count++;
      }
    } else {
      result.push({bonus: b, count: 1});
    }
  }
  return result;
}
