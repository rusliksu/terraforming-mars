import {expect} from 'chai';
import {MoonBoard} from '../../src/server/moon/MoonBoard';
import {SeededRandom} from '../../src/common/utils/Random';
import {DEFAULT_GAME_OPTIONS} from '../../src/server/game/GameOptions';
import {SpaceType} from '../../src/common/boards/SpaceType';
import {SpaceBonus} from '../../src/common/boards/SpaceBonus';
import {NamedMoonSpaces} from '../../src/common/moon/NamedMoonSpaces';
import {blankSimpleBoard} from '../../src/common/boards/SimpleCustomBoardDefinition';
import {TestPlayer} from '../TestPlayer';

describe('MoonBoard with a custom definition', () => {
  it('builds the grid from the definition instead of the hard-coded default', () => {
    const def = blankSimpleBoard('moon', 'All Land');
    // blankSimpleBoard is all-LAND; flip one cell to prove the definition actually drives it.
    def.spaces[0].spaceType = SpaceType.LUNAR_MINE;
    def.spaces[0].bonus = [SpaceBonus.TITANIUM];

    const board = MoonBoard.newInstance({...DEFAULT_GAME_OPTIONS, customMoonBoard: def}, new SeededRandom(0));

    const gridSpaces = board.spaces.filter((s) => s.spaceType !== SpaceType.COLONY);
    expect(gridSpaces).to.have.length(35);
    expect(gridSpaces.every((s, i) => i === 0 || s.spaceType === SpaceType.LAND)).is.true;
    expect(gridSpaces[0].spaceType).to.eq(SpaceType.LUNAR_MINE);
    expect(gridSpaces[0].bonus).to.deep.eq([SpaceBonus.TITANIUM]);
  });

  it('still appends the reserved off-grid Luna Trade Station/Momentum Virium spaces', () => {
    const def = blankSimpleBoard('moon', 'All Land');
    const board = MoonBoard.newInstance({...DEFAULT_GAME_OPTIONS, customMoonBoard: def}, new SeededRandom(0));

    expect(board.getSpaceOrThrow(NamedMoonSpaces.LUNA_TRADE_STATION).spaceType).to.eq(SpaceType.COLONY);
    expect(board.getSpaceOrThrow(NamedMoonSpaces.MOMENTUM_VIRIUM).spaceType).to.eq(SpaceType.COLONY);
  });

  it('ignores shuffleMapOption when a custom definition is supplied', () => {
    const def = blankSimpleBoard('moon', 'All Land');
    const before = MoonBoard.newInstance({...DEFAULT_GAME_OPTIONS, customMoonBoard: def}, new SeededRandom(1));
    const after = MoonBoard.newInstance({...DEFAULT_GAME_OPTIONS, customMoonBoard: def, shuffleMapOption: true}, new SeededRandom(1));
    expect(after.spaces).to.deep.eq(before.spaces);
  });

  it('assigns the same grid ids as the default path, regardless of definition content', () => {
    const def = blankSimpleBoard('moon', 'All Land');
    const custom = MoonBoard.newInstance({...DEFAULT_GAME_OPTIONS, customMoonBoard: def}, new SeededRandom(0));
    const stock = MoonBoard.newInstance(DEFAULT_GAME_OPTIONS, new SeededRandom(0));
    expect(custom.spaces.map((s) => s.id)).to.deep.eq(stock.spaces.map((s) => s.id));
  });

  it('omits a voided cell from the board entirely, without shifting later cells\' ids', () => {
    const def = blankSimpleBoard('moon', 'All Land');
    def.spaces[1].voided = true; // second grid cell -- would be 'm03' if present.

    const board = MoonBoard.newInstance({...DEFAULT_GAME_OPTIONS, customMoonBoard: def}, new SeededRandom(0));
    const gridSpaces = board.spaces.filter((s) => s.spaceType !== SpaceType.COLONY);

    expect(gridSpaces).to.have.length(34);
    expect(gridSpaces.some((s) => s.id === 'm03')).is.false;
    // Every OTHER cell keeps the exact id it has on the un-voided default board -- MoonBoard.vue
    // positions hexes by hand-tuned CSS keyed to that literal id, so a shift would silently break
    // every hex after the void.
    const stock = MoonBoard.newInstance(DEFAULT_GAME_OPTIONS, new SeededRandom(0));
    const stockIdsMinusVoided = stock.spaces.filter((s) => s.id !== 'm03').map((s) => s.id);
    expect(gridSpaces.map((s) => s.id)).to.deep.eq(stockIdsMinusVoided.filter((id) => id.startsWith('m') && id !== 'm01' && id !== 'm37'));
  });

  it('a voided cell is excluded from mine-tile placement', () => {
    const def = blankSimpleBoard('moon', 'All Mine');
    def.spaces.forEach((s) => {
      s.spaceType = SpaceType.LUNAR_MINE;
    });
    def.spaces[0].voided = true;

    const board = MoonBoard.newInstance({...DEFAULT_GAME_OPTIONS, customMoonBoard: def}, new SeededRandom(0));
    const player = TestPlayer.BLUE.newPlayer();
    const available = board.getAvailableSpacesForMine(player);
    // 35 grid spaces, minus the 1 voided, minus the 4 named Mare spaces (always excluded from mine
    // placement regardless of type -- getAvailableSpacesForMine filters them out by id).
    expect(available).to.have.length(30);
  });
});
