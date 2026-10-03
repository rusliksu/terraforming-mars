import {expect} from 'chai';
import {VenusSurfaceBoard, VENUS_STRATOPOLIS, VENUS_MAXWELL_BASE} from '../../src/server/venusPhase2/VenusSurfaceBoard';
import {SeededRandom} from '../../src/common/utils/Random';
import {DEFAULT_GAME_OPTIONS} from '../../src/server/game/GameOptions';
import {SpaceType} from '../../src/common/boards/SpaceType';
import {SpaceBonus} from '../../src/common/boards/SpaceBonus';
import {blankSimpleBoard} from '../../src/common/boards/SimpleCustomBoardDefinition';
import {TestPlayer} from '../TestPlayer';

describe('VenusSurfaceBoard with a custom definition', () => {
  it('builds the grid from the definition instead of the hard-coded default', () => {
    const def = blankSimpleBoard('venusPhase2', 'All Land');
    def.spaces[0].spaceType = SpaceType.GASLIGHT;

    const board = VenusSurfaceBoard.newInstance(
      {...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: def}, new SeededRandom(0));

    const gridSpaces = board.spaces.filter((s) => s.spaceType !== SpaceType.COLONY);
    expect(gridSpaces).to.have.length(37);
    expect(gridSpaces[0].spaceType).to.eq(SpaceType.GASLIGHT);
    expect(gridSpaces.every((s, i) => i === 0 || s.spaceType === SpaceType.LAND)).is.true;
  });

  it('still appends the reserved off-grid Stratopolis/Maxwell Base spaces, expansion-gated as usual', () => {
    const def = blankSimpleBoard('venusPhase2', 'All Land');
    const board = VenusSurfaceBoard.newInstance(
      {...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: def, expansions: {...DEFAULT_GAME_OPTIONS.expansions, venus: true}},
      new SeededRandom(0));

    expect(board.getSpaceOrThrow(VENUS_STRATOPOLIS).spaceType).to.eq(SpaceType.COLONY);
    expect(board.getSpaceOrThrow(VENUS_MAXWELL_BASE).spaceType).to.eq(SpaceType.COLONY);
  });

  it('assigns ids purely by grid position, unaffected by a definition\'s painted content', () => {
    // Deliberately compares two custom boards, not the hard-coded default -- that default is now
    // a bespoke, changeable design (see the map-editor-exported layout in VenusSurfaceBoard.ts),
    // not a good target for a test about the generic id-derivation scheme.
    const blank = blankSimpleBoard('venusPhase2', 'All Land');
    const painted = blankSimpleBoard('venusPhase2', 'Painted');
    painted.spaces[0].spaceType = SpaceType.GASLIGHT;
    painted.spaces[0].bonus = [SpaceBonus.HEAT];

    const blankBoard = VenusSurfaceBoard.newInstance({...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: blank}, new SeededRandom(0));
    const paintedBoard = VenusSurfaceBoard.newInstance({...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: painted}, new SeededRandom(0));
    expect(paintedBoard.spaces.map((s) => s.id)).to.deep.eq(blankBoard.spaces.map((s) => s.id));
  });

  it('places a map-editor-chosen reservation on that exact grid cell instead of the off-grid fallback', () => {
    const def = blankSimpleBoard('venusPhase2', 'Chosen Spots');
    def.spaces[5].reserved = 'stratopolis';
    def.spaces[10].reserved = 'maxwellBase';
    const gameOptions = {...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: def, expansions: {...DEFAULT_GAME_OPTIONS.expansions, venus: true}};

    const board = VenusSurfaceBoard.newInstance(gameOptions, new SeededRandom(0));

    const stratopolis = board.getSpaceOrThrow(VENUS_STRATOPOLIS);
    expect(stratopolis.spaceType).to.eq(SpaceType.COLONY);
    expect(stratopolis.x).to.eq(def.spaces[5].x);
    expect(stratopolis.y).to.eq(def.spaces[5].y);

    const maxwellBase = board.getSpaceOrThrow(VENUS_MAXWELL_BASE);
    expect(maxwellBase.spaceType).to.eq(SpaceType.COLONY);
    expect(maxwellBase.x).to.eq(def.spaces[10].x);
    expect(maxwellBase.y).to.eq(def.spaces[10].y);

    // No separate off-grid entry for either -- the on-grid reservation already covers it.
    expect(board.spaces.filter((s) => s.x === -1 && s.y === -1)).to.have.length(0);
    expect(board.spaces).to.have.length(37);
  });

  it('excludes a chosen reservation from normal land placement', () => {
    const def = blankSimpleBoard('venusPhase2', 'Chosen Spot');
    def.spaces[5].reserved = 'stratopolis';
    const gameOptions = {...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: def, expansions: {...DEFAULT_GAME_OPTIONS.expansions, venus: true}};
    const board = VenusSurfaceBoard.newInstance(gameOptions, new SeededRandom(0));

    const player = TestPlayer.BLUE.newPlayer();
    const landIds = board.getAvailableSpacesForLand(player).map((s) => s.id);
    expect(landIds).to.not.include(VENUS_STRATOPOLIS);
  });

  it('ignores a reservation for a card that is not actually in this game\'s deck', () => {
    const def = blankSimpleBoard('venusPhase2', 'Ignored Reservation');
    def.spaces[5].reserved = 'stratopolis';
    // Neither the Venus expansion nor Stratopolis specifically is included here.
    const board = VenusSurfaceBoard.newInstance({...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: def}, new SeededRandom(0));

    expect(() => board.getSpaceOrThrow(VENUS_STRATOPOLIS)).to.throw();
    // The cell just reverts to a normal grid space instead of vanishing.
    expect(board.spaces).to.have.length(37);
  });

  it('omits a voided cell from the board entirely, without shifting later cells\' ids', () => {
    const withoutVoid = blankSimpleBoard('venusPhase2', 'No Hole');
    const withVoid = blankSimpleBoard('venusPhase2', 'Punch A Hole');
    withVoid.spaces[5].voided = true;

    const boardWithoutVoid = VenusSurfaceBoard.newInstance({...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: withoutVoid}, new SeededRandom(0));
    const boardWithVoid = VenusSurfaceBoard.newInstance({...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: withVoid}, new SeededRandom(0));
    const gridSpaces = boardWithVoid.spaces.filter((s) => s.spaceType !== SpaceType.COLONY);

    expect(gridSpaces).to.have.length(36);
    expect(gridSpaces.map((s) => s.id)).to.not.include('206'); // idx 5 + idOffset 1 = 206.
    const idsWithoutTheVoidedOne = boardWithoutVoid.spaces
      .filter((s) => s.spaceType !== SpaceType.COLONY && s.id !== '206')
      .map((s) => s.id);
    expect(gridSpaces.map((s) => s.id)).to.deep.eq(idsWithoutTheVoidedOne);
  });

  it('a voided cell is excluded from land placement', () => {
    const def = blankSimpleBoard('venusPhase2', 'Punch A Hole');
    def.spaces[5].voided = true;
    const board = VenusSurfaceBoard.newInstance({...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: def}, new SeededRandom(0));

    const player = TestPlayer.BLUE.newPlayer();
    // blankSimpleBoard is all-LAND -- 37 grid spaces, minus the 1 voided.
    expect(board.getAvailableSpacesForLand(player)).to.have.length(36);
  });

  it('ignores a reservation on a voided cell, falling back off-grid (the board itself does not validate this -- see simpleBoardCodec.spec.ts for the actual guard)', () => {
    const def = blankSimpleBoard('venusPhase2', 'Contradiction');
    def.spaces[5].voided = true;
    def.spaces[5].reserved = 'stratopolis';
    const gameOptions = {...DEFAULT_GAME_OPTIONS, customVenusSurfaceBoard: def, expansions: {...DEFAULT_GAME_OPTIONS.expansions, venus: true}};

    const board = VenusSurfaceBoard.newInstance(gameOptions, new SeededRandom(0));
    expect(board.getSpaceOrThrow(VENUS_STRATOPOLIS).x).to.eq(-1);
  });
});
