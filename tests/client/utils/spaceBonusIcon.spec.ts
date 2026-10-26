import {expect} from 'chai';
import {groupSpaceBonuses, spaceBonusCss} from '@/client/utils/spaceBonusIcon';
import {SpaceBonus} from '@/common/boards/SpaceBonus';

describe('spaceBonusIcon', () => {
  describe('spaceBonusCss', () => {
    it('returns the css suffix for a recognized bonus', () => {
      expect(spaceBonusCss(SpaceBonus.MEGACREDITS)).to.eq('megacredit');
      expect(spaceBonusCss(SpaceBonus.STEEL)).to.eq('steel');
    });

    it('returns an empty string for an unrecognized bonus', () => {
      expect(spaceBonusCss(SpaceBonus._RESTRICTED)).to.eq('');
    });

    it("maps the two double-wide/official-only bonuses too (Vastitas Borealis Nova's temperature-for-4MC, Deimos Down's asteroid)", () => {
      expect(spaceBonusCss(SpaceBonus.TEMPERATURE_4MC)).to.eq('bonustemperature4mc');
      expect(spaceBonusCss(SpaceBonus.ASTEROID)).to.eq('asteroid');
    });

    it("has a real icon for every SpaceBonus except the structural _RESTRICTED marker (regression guard: a map thumbnail rendered a blank hex where Vastitas Borealis Nova's temperature bonus belongs, because this map was missing an entry Bonus.vue already had)", () => {
      const allBonuses = Object.values(SpaceBonus).filter((b): b is SpaceBonus => typeof b === 'number');
      for (const bonus of allBonuses) {
        if (bonus === SpaceBonus._RESTRICTED) {
          continue;
        }
        expect(spaceBonusCss(bonus), `SpaceBonus value ${bonus}`).to.not.eq('');
      }
    });
  });

  describe('groupSpaceBonuses', () => {
    it('leaves non-M€ bonuses exploded, one entry per instance', () => {
      const result = groupSpaceBonuses([SpaceBonus.STEEL, SpaceBonus.STEEL, SpaceBonus.TITANIUM]);
      expect(result).to.deep.eq([
        {bonus: SpaceBonus.STEEL, count: 1},
        {bonus: SpaceBonus.STEEL, count: 1},
        {bonus: SpaceBonus.TITANIUM, count: 1},
      ]);
    });

    it('collapses repeated M€ bonuses into one entry with a count', () => {
      const result = groupSpaceBonuses([SpaceBonus.MEGACREDITS, SpaceBonus.MEGACREDITS]);
      expect(result).to.deep.eq([{bonus: SpaceBonus.MEGACREDITS, count: 2}]);
    });

    it('collapses M€ at the position of its first occurrence, leaving other bonuses in place', () => {
      const result = groupSpaceBonuses([SpaceBonus.STEEL, SpaceBonus.MEGACREDITS, SpaceBonus.TITANIUM, SpaceBonus.MEGACREDITS]);
      expect(result).to.deep.eq([
        {bonus: SpaceBonus.STEEL, count: 1},
        {bonus: SpaceBonus.MEGACREDITS, count: 2},
        {bonus: SpaceBonus.TITANIUM, count: 1},
      ]);
    });

    it('returns an empty array for no bonuses', () => {
      expect(groupSpaceBonuses([])).to.deep.eq([]);
    });
  });
});
