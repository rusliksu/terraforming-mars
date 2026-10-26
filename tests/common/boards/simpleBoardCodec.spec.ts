import {expect} from 'chai';
import {
  SimpleBoardCodecError,
  decodeSimpleBoard,
  encodeSimpleBoard,
  validateSimpleBoard,
} from '../../../src/common/boards/simpleBoardCodec';
import {blankSimpleBoard} from '../../../src/common/boards/SimpleCustomBoardDefinition';
import {SpaceBonus} from '../../../src/common/boards/SpaceBonus';
import {SpaceType} from '../../../src/common/boards/SpaceType';
import {bytesToBase64url} from '../../../src/common/utils/base64url';

describe('simpleBoardCodec', () => {
  it('round-trips a blank Moon board', () => {
    const def = blankSimpleBoard('moon', 'Test Moon');
    const decoded = decodeSimpleBoard(encodeSimpleBoard(def));
    expect(decoded).to.deep.eq(def);
    expect(decoded.spaces).to.have.length(35);
  });

  it('round-trips a blank Venus Phase 2 board', () => {
    const def = blankSimpleBoard('venusPhase2', 'Test Venus');
    const decoded = decodeSimpleBoard(encodeSimpleBoard(def));
    expect(decoded).to.deep.eq(def);
    expect(decoded.spaces).to.have.length(37);
  });

  it('round-trips varied space types and bonuses on Moon', () => {
    const def = blankSimpleBoard('moon', 'Varied');
    def.spaces[0].spaceType = SpaceType.LUNAR_MINE;
    def.spaces[0].bonus = [SpaceBonus.TITANIUM, SpaceBonus.TITANIUM];
    def.spaces[1].bonus = [SpaceBonus.STEEL, SpaceBonus.DRAW_CARD];

    const decoded = decodeSimpleBoard(encodeSimpleBoard(def));
    expect(decoded).to.deep.eq(def);
  });

  it('round-trips varied space types on Venus', () => {
    const def = blankSimpleBoard('venusPhase2', 'Varied');
    def.spaces[0].spaceType = SpaceType.GASLIGHT;

    const decoded = decodeSimpleBoard(encodeSimpleBoard(def));
    expect(decoded).to.deep.eq(def);
  });

  it('rejects a Moon-only space type on a Venus board', () => {
    const def = blankSimpleBoard('venusPhase2', 'Bad');
    def.spaces[0].spaceType = SpaceType.LUNAR_MINE;
    expect(() => validateSimpleBoard(def)).to.throw(SimpleBoardCodecError);
  });

  it('rejects a Venus-only space type on a Moon board', () => {
    const def = blankSimpleBoard('moon', 'Bad');
    def.spaces[0].spaceType = SpaceType.GASLIGHT;
    expect(() => validateSimpleBoard(def)).to.throw(SimpleBoardCodecError);
  });

  it('rejects a name that is too long', () => {
    const def = blankSimpleBoard('moon', 'x'.repeat(25));
    expect(() => validateSimpleBoard(def)).to.throw(SimpleBoardCodecError);
  });

  it('rejects an empty name', () => {
    const def = blankSimpleBoard('moon', '');
    expect(() => validateSimpleBoard(def)).to.throw(SimpleBoardCodecError);
  });

  it('rejects a definition with the wrong number of spaces', () => {
    const def = blankSimpleBoard('moon', 'Short');
    def.spaces.pop();
    expect(() => validateSimpleBoard(def)).to.throw(SimpleBoardCodecError);
  });

  it('rejects a code with the wrong prefix', () => {
    expect(() => decodeSimpleBoard('NOTACODE')).to.throw(SimpleBoardCodecError);
  });

  it('rejects a garbled code after the prefix', () => {
    expect(() => decodeSimpleBoard('TMBS1!!!not-valid-base64!!!')).to.throw(SimpleBoardCodecError);
  });

  it('round-trips a chosen Stratopolis/Maxwell Base reservation on Venus', () => {
    const def = blankSimpleBoard('venusPhase2', 'Reserved');
    def.spaces[5].reserved = 'stratopolis';
    def.spaces[10].reserved = 'maxwellBase';

    const decoded = decodeSimpleBoard(encodeSimpleBoard(def));
    expect(decoded).to.deep.eq(def);
    expect(decoded.spaces[5].reserved).to.eq('stratopolis');
    expect(decoded.spaces[10].reserved).to.eq('maxwellBase');
  });

  it('an unreserved space round-trips with no reserved key at all (not reserved: undefined)', () => {
    // Guards against a subtle equality footgun: {reserved: undefined} and a missing 'reserved'
    // key are different objects under a strict deep-eq, even though both mean "not reserved".
    const def = blankSimpleBoard('venusPhase2', 'Plain');
    const decoded = decodeSimpleBoard(encodeSimpleBoard(def));
    expect(decoded.spaces.every((s) => !('reserved' in s))).is.true;
  });

  it('rejects two spaces both reserved for Stratopolis', () => {
    const def = blankSimpleBoard('venusPhase2', 'Bad');
    def.spaces[0].reserved = 'stratopolis';
    def.spaces[1].reserved = 'stratopolis';
    expect(() => validateSimpleBoard(def)).to.throw(SimpleBoardCodecError);
  });

  it('rejects two spaces both reserved for Maxwell Base', () => {
    const def = blankSimpleBoard('venusPhase2', 'Bad');
    def.spaces[0].reserved = 'maxwellBase';
    def.spaces[1].reserved = 'maxwellBase';
    expect(() => validateSimpleBoard(def)).to.throw(SimpleBoardCodecError);
  });

  it('allows one Stratopolis reservation and one Maxwell Base reservation together', () => {
    const def = blankSimpleBoard('venusPhase2', 'Fine');
    def.spaces[0].reserved = 'stratopolis';
    def.spaces[1].reserved = 'maxwellBase';
    expect(() => validateSimpleBoard(def)).to.not.throw();
  });

  it('rejects a reservation on a Moon board', () => {
    const def = blankSimpleBoard('moon', 'Bad');
    def.spaces[0].reserved = 'stratopolis';
    expect(() => validateSimpleBoard(def)).to.throw(SimpleBoardCodecError);
  });

  it('round-trips a voided cell, on either board type', () => {
    for (const boardType of ['moon', 'venusPhase2'] as const) {
      const def = blankSimpleBoard(boardType, 'Punch A Hole');
      def.spaces[3].voided = true;

      const decoded = decodeSimpleBoard(encodeSimpleBoard(def));
      expect(decoded).to.deep.eq(def);
      expect(decoded.spaces[3].voided).is.true;
    }
  });

  it('a non-voided space round-trips with no voided key at all (not voided: false)', () => {
    const def = blankSimpleBoard('venusPhase2', 'Plain');
    const decoded = decodeSimpleBoard(encodeSimpleBoard(def));
    expect(decoded.spaces.every((s) => !('voided' in s))).is.true;
  });

  it('round-trips a voided cell together with an unrelated reservation elsewhere on the board', () => {
    const def = blankSimpleBoard('venusPhase2', 'Both');
    def.spaces[3].voided = true;
    def.spaces[5].reserved = 'stratopolis';

    const decoded = decodeSimpleBoard(encodeSimpleBoard(def));
    expect(decoded).to.deep.eq(def);
  });

  it('rejects a space that is both voided and reserved', () => {
    const def = blankSimpleBoard('venusPhase2', 'Contradiction');
    def.spaces[0].voided = true;
    def.spaces[0].reserved = 'stratopolis';
    expect(() => validateSimpleBoard(def)).to.throw(SimpleBoardCodecError);
  });

  it('rejects a definition where every space is voided', () => {
    const def = blankSimpleBoard('moon', 'Nothing Left');
    def.spaces.forEach((s) => {
      s.voided = true;
    });
    expect(() => validateSimpleBoard(def)).to.throw(SimpleBoardCodecError);
  });

  it('allows all but one space voided', () => {
    const def = blankSimpleBoard('moon', 'One Left');
    def.spaces.forEach((s, i) => {
      s.voided = i !== 0;
    });
    expect(() => validateSimpleBoard(def)).to.not.throw();
  });

  it('rejects a decoded wire payload with an unknown board type', () => {
    // Craft a code decode would otherwise accept structurally, but with a board type that isn't
    // 'moon'/'venusPhase2' -- this can't happen through encodeSimpleBoard's typed input, only via
    // a hand-crafted or future-version code, so build the wire payload directly.
    const wire = {v: 1, t: 'mars', n: 'Test', s: []};
    const bytes = new TextEncoder().encode(JSON.stringify(wire));
    const code = 'TMBS1' + bytesToBase64url(bytes);
    expect(() => decodeSimpleBoard(code)).to.throw(SimpleBoardCodecError);
  });
});
