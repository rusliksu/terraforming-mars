import {expect} from 'chai';
import {
  CustomBoardCodecError,
  decodeCustomBoard,
  encodeCustomBoard,
  validateCustomBoard,
} from '../../../src/common/boards/customBoardCodec';
import {blankCustomBoard, CustomBoardDefinition} from '../../../src/common/boards/CustomBoardDefinition';
import {SpaceBonus} from '../../../src/common/boards/SpaceBonus';
import {SpaceType} from '../../../src/common/boards/SpaceType';
import {DEFAULT_GLOBAL_PARAMETERS} from '../../../src/common/GlobalParameterConfig';

describe('customBoardCodec', () => {
  it('round-trips a blank 9-row board', () => {
    const def = blankCustomBoard(9, 'Test Map');
    const decoded = decodeCustomBoard(encodeCustomBoard(def));
    expect(decoded).to.deep.eq(def);
    expect(decoded.spaces).to.have.length(61);
  });

  it('round-trips varied terrain, bonuses, volcanic and reserved', () => {
    const def = blankCustomBoard(9, 'Terrain');
    def.spaces[0].spaceType = SpaceType.OCEAN;
    def.spaces[1].spaceType = SpaceType.COVE;
    def.spaces[2].spaceType = SpaceType.RESTRICTED;
    def.spaces[3].spaceType = SpaceType.DEFLECTION_ZONE;
    def.spaces[4].volcanic = true;
    def.spaces[4].bonus = [SpaceBonus.PLANT, SpaceBonus.PLANT];
    def.spaces[5].reserved = true;
    def.spaces[6].bonus = [SpaceBonus.STEEL, SpaceBonus.TITANIUM, SpaceBonus.DRAW_CARD];

    const decoded = decodeCustomBoard(encodeCustomBoard(def));
    expect(decoded).to.deep.eq(def);
  });

  it('round-trips a carved outline (void cells)', () => {
    const def = blankCustomBoard(9, 'Carved');
    // Drop the four corners of the hexagon.
    const drop = new Set([def.spaces[0].id, def.spaces[4].id, def.spaces[56].id, def.spaces[60].id]);
    def.spaces = def.spaces.filter((s) => !drop.has(s.id));
    // Ids are positional, so renumber to what the codec will produce.
    def.spaces.forEach((s, i) => (s.id = blankCustomBoard(9, '').spaces[i].id));

    const decoded = decodeCustomBoard(encodeCustomBoard(def));
    expect(decoded.spaces).to.have.length(57);
    expect(decoded).to.deep.eq(def);
  });

  it('round-trips a non-standard row count', () => {
    const def = blankCustomBoard(13, 'Big');
    const decoded = decodeCustomBoard(encodeCustomBoard(def));
    expect(decoded).to.deep.eq(def);
    // 7+8+9+10+11+12+13+12+11+10+9+8+7
    expect(decoded.spaces).to.have.length(127);
  });

  it('round-trips fixed milestones and awards', () => {
    const def = blankCustomBoard(9, 'MA');
    def.milestones = ['Terraformer', 'Mayor', 'Gardener', 'Planner', 'Builder'];
    def.awards = ['Landlord', 'Scientist', 'Banker', 'Thermalist', 'Miner'];
    const decoded = decodeCustomBoard(encodeCustomBoard(def));
    expect(decoded).to.deep.eq(def);
  });

  it('round-trips custom global parameters', () => {
    const def: CustomBoardDefinition = blankCustomBoard(9, 'Params');
    def.globalParameters = {
      temperature: {min: -40, max: 20, step: 2, bonuses: [{value: 0, kind: 'ocean'}, {value: -10, kind: 'heatProduction', amount: 2}]},
      oxygen: {min: 0, max: 20, step: 1, bonuses: [{value: 12, kind: 'temperature'}, {value: 6, kind: 'card', amount: 1}]},
      venus: {min: 0, max: 30, step: 2, bonuses: [{value: 16, kind: 'tr', amount: 1}]},
      oceans: {max: 14},
      heatForTemperature: 6,
    };
    const decoded = decodeCustomBoard(encodeCustomBoard(def));
    expect(decoded).to.deep.eq(def);
  });

  it('round-trips the default global parameters', () => {
    const def = blankCustomBoard(9, 'Defaults');
    def.globalParameters = structuredClone(DEFAULT_GLOBAL_PARAMETERS);
    const decoded = decodeCustomBoard(encodeCustomBoard(def));
    expect(decoded.globalParameters).to.deep.eq(DEFAULT_GLOBAL_PARAMETERS);
  });

  it('round-trips custom placement bonus costs', () => {
    const def = blankCustomBoard(9, 'Costs');
    def.placementBonusCosts = {ocean: 8, temperature: 1, colony: 12};
    const decoded = decodeCustomBoard(encodeCustomBoard(def));
    expect(decoded).to.deep.eq(def);
  });

  it('omits placement bonus costs when unset', () => {
    const def = blankCustomBoard(9, 'No costs');
    const decoded = decodeCustomBoard(encodeCustomBoard(def));
    expect(decoded.placementBonusCosts).is.undefined;
  });

  it('rejects a bad prefix', () => {
    expect(() => decodeCustomBoard('NOPE12345')).to.throw(CustomBoardCodecError, /must start with TMB3/);
  });

  it('rejects invalid base64url characters', () => {
    expect(() => decodeCustomBoard('TMB3!!!!')).to.throw(CustomBoardCodecError);
  });

  it('rejects truncated data', () => {
    const code = encodeCustomBoard(blankCustomBoard(9, 'x'));
    expect(() => decodeCustomBoard(code.slice(0, 10))).to.throw(CustomBoardCodecError);
  });

  it('rejects an unknown milestone name', () => {
    const def = blankCustomBoard(9, 'x');
    (def.milestones as Array<string>) = ['Terraformer', 'Mayor', 'Gardener', 'Planner', 'Not A Milestone'];
    expect(() => decodeCustomBoard(encodeCustomBoard(def as CustomBoardDefinition))).to.throw(CustomBoardCodecError, /Unknown milestone/);
  });

  it('validate flags a board with no oceans', () => {
    const warnings = validateCustomBoard(blankCustomBoard(9, 'Dry'));
    expect(warnings.some((w) => w.includes('no ocean spaces'))).is.true;
  });
});
