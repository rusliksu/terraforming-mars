import {Board} from '../boards/Board';
import {Space} from '../boards/Space';
import {IPlayer} from '../IPlayer';
import {SpaceType} from '../../common/boards/SpaceType';
import {SpaceBonus} from '../../common/boards/SpaceBonus';
import {SpaceId, isSpaceId, safeCast} from '../../common/Types';
import {GameOptions} from '../../server/game/GameOptions';
import {Random} from '../../common/utils/Random';
import {CardName} from '../../common/cards/CardName';
import {VENUS_SURFACE_ROWS, VenusReservedSpot} from '../../common/boards/SimpleCustomBoardDefinition';
import {hexRowLayout} from '../../common/boards/CustomBoardDefinition';

// Deliberately NOT SpaceName.STRATOPOLIS/MAXWELL_BASE ('72'/'73') -- those are the Mars board's
// own space ids, and this is a genuinely separate Board instance with its own numeric range
// (200+). Reusing them would collide once client-side rendering keys off space id (DOM
// data_space_id, log-highlight lookup), even though server-side lookups stay board-scoped and
// wouldn't have noticed. Fixed regardless of where the reserved space actually ends up (on-grid,
// picked via the map editor, or the off-grid fallback below) -- Stratopolis.ts/MaxwellBase.ts look
// these ids up directly and never need to know which case applies.
export const VENUS_STRATOPOLIS: SpaceId = safeCast('298', isSpaceId);
export const VENUS_MAXWELL_BASE: SpaceId = safeCast('299', isSpaceId);

function colonySpace(id: SpaceId): Space {
  return {id, spaceType: SpaceType.COLONY, x: -1, y: -1, bonus: []};
}

export class VenusSurfaceBoard extends Board {
  // Any open, non-reserved surface space -- Cloud City and Floater Array can go here.
  public getAvailableSpacesForLand(player: IPlayer): ReadonlyArray<Space> {
    return this.spaces.filter((space) =>
      space.tile === undefined &&
      space.spaceType === SpaceType.LAND &&
      (space.player === undefined || space.player.id === player.id));
  }

  // Gas Mine is restricted to the yellow-highlighted "gaslight" spaces.
  public getAvailableSpacesForGaslight(player: IPlayer): ReadonlyArray<Space> {
    return this.spaces.filter((space) =>
      space.tile === undefined &&
      space.spaceType === SpaceType.GASLIGHT &&
      (space.player === undefined || space.player.id === player.id));
  }

  public static newInstance(gameOptions: GameOptions, _rng: Random): VenusSurfaceBoard {
    const b = new Builder();
    const custom = gameOptions.customVenusSurfaceBoard;

    if (custom !== undefined) {
      // A user-authored layout from the map editor (see SimpleCustomBoardDefinition.ts). Its
      // `spaces` are already in the same row-major order as the grid loop in Builder.build()
      // below (both derive from the same simpleBoardLayout('venusPhase2') shape), so this just
      // supplies the type/bonus/reserved/voided arrays that loop reads.
      for (const space of custom.spaces) {
        b.spaceTypes.push(space.spaceType);
        b.bonuses.push(space.bonus);
        b.reservedNames.push(space.reserved);
        b.voided.push(space.voided === true);
      }
    } else {
      // A true regular hexagon (side length 4 -- see VENUS_SURFACE_ROWS), designed in the map
      // editor and exported via its "Copy as default board source" button: open land for Cloud
      // City/Floater Array, gaslight spaces for Gas Mine, energy/heat/card placement bonuses
      // scattered through it, two voided hexes punched out of the middle row, and Stratopolis/
      // Maxwell Base's own reserved spots (mirrored near the top and bottom edges) -- falls back
      // to the off-grid placement below only if one of those two cards isn't even in this game's
      // deck.
      b.row(3).gaslight(SpaceBonus.HEAT).land().land(SpaceBonus.ENERGY).land();
      b.row(2).land().land().gaslight(SpaceBonus.HEAT).gaslight(SpaceBonus.HEAT, SpaceBonus.HEAT, SpaceBonus.HEAT).land(SpaceBonus.ENERGY);
      b.row(1).land(SpaceBonus.DRAW_CARD, SpaceBonus.DRAW_CARD).gaslight(SpaceBonus.HEAT, SpaceBonus.HEAT).stratopolis().land(SpaceBonus.ENERGY).gaslight(SpaceBonus.HEAT).land();
      b.row(0).void().gaslight(SpaceBonus.HEAT).land().land().land(SpaceBonus.ENERGY).land().void();
      b.row(1).land(SpaceBonus.ENERGY, SpaceBonus.ENERGY).land(SpaceBonus.ENERGY).gaslight(SpaceBonus.HEAT, SpaceBonus.HEAT).land(SpaceBonus.ENERGY).maxwellBase().gaslight(SpaceBonus.HEAT, SpaceBonus.HEAT);
      b.row(2).land().gaslight(SpaceBonus.HEAT).gaslight(SpaceBonus.HEAT).land(SpaceBonus.ENERGY).gaslight(SpaceBonus.HEAT, SpaceBonus.HEAT);
      b.row(3).land(SpaceBonus.ENERGY, SpaceBonus.DRAW_CARD).gaslight(SpaceBonus.HEAT).land().land(SpaceBonus.DRAW_CARD, SpaceBonus.DRAW_CARD);
    }

    const spaces = b.build(gameOptions);
    return new VenusSurfaceBoard(spaces);
  }
}

class Builder {
  y: number = -1;
  x: number = 0;
  spaceTypes: Array<SpaceType> = [];
  bonuses: Array<Array<SpaceBonus>> = [];
  reservedNames: Array<VenusReservedSpot | undefined> = [];
  // Parallel to spaceTypes/bonuses/reservedNames, one entry per grid position -- see build()'s
  // loop, which still increments idx for a voided position (just skips pushing a Space for it) so
  // every OTHER cell's id stays exactly what it would've been without the void.
  voided: Array<boolean> = [];
  spaces: Array<Space> = [];

  public row(startX: number): Row {
    this.y++;
    this.x = startX;
    return new Row(this);
  }
  public build(gameOptions: GameOptions): Array<Space> {
    // A true regular hexagon, built with hexRowLayout -- the exact same proven formula Mars's own
    // boards use (see VENUS_SURFACE_ROWS's own comment). customSpacePixel (the generic pixel-layout
    // formula both this board's client component and the map editor's preview use) requires
    // exactly this kind of shape; an earlier hand-rolled attempt looked plausible but wasn't
    // actually regular (mismatched edge lengths) and rendered with visible gaps and a stray hex.
    const stratopolisInPlay = gameOptions.expansions.venus || gameOptions.includedCards.includes(CardName.STRATOPOLIS);
    const maxwellBaseInPlay = gameOptions.expansions.venus || gameOptions.includedCards.includes(CardName.MAXWELL_BASE);
    let foundStratopolis = false;
    let foundMaxwellBase = false;

    const idOffset = 1;
    let idx = 0;

    for (const row of hexRowLayout(VENUS_SURFACE_ROWS)) {
      for (let i = 0; i < row.width; i++) {
        // A voided cell doesn't exist on the board at all -- no Space is created for it -- but idx
        // still advances, so every cell after it keeps the exact id it would've had without the
        // void (ids are purely idx-derived; see Builder.spaceId).
        if (this.voided[idx] === true) {
          idx++;
          continue;
        }
        // A cell reserved for a card that isn't even in this game's deck is just a normal cell of
        // whatever type it was painted -- no point excluding a hex from placement for a card that
        // will never be played (also lets a custom board someone else made, that reserves a spot
        // for a card you don't have in your deck, still work sensibly).
        let reservedName = this.reservedNames[idx];
        if (reservedName === 'stratopolis' && !stratopolisInPlay) {
          reservedName = undefined;
        }
        if (reservedName === 'maxwellBase' && !maxwellBaseInPlay) {
          reservedName = undefined;
        }

        const spaceId = reservedName === 'stratopolis' ? VENUS_STRATOPOLIS :
          reservedName === 'maxwellBase' ? VENUS_MAXWELL_BASE :
            Builder.spaceId(idx + idOffset);
        const spaceType = reservedName !== undefined ? SpaceType.COLONY : this.spaceTypes[idx];

        const space: Space = {
          id: spaceId,
          spaceType,
          x: row.xOffset + i,
          y: row.y,
          bonus: this.bonuses[idx] ?? [],
        };
        this.spaces.push(space);
        if (reservedName === 'stratopolis') {
          foundStratopolis = true;
        }
        if (reservedName === 'maxwellBase') {
          foundMaxwellBase = true;
        }
        idx++;
      }
    }

    // Stratopolis/MaxwellBase's reserved off-grid fallback, relocated here from the Mars board --
    // only used when no on-grid cell claimed the reservation above (an older custom code, or the
    // hard-coded default's own reservation being skipped because that card isn't in the deck).
    if (stratopolisInPlay && !foundStratopolis) {
      this.spaces.push(colonySpace(VENUS_STRATOPOLIS));
    }
    if (maxwellBaseInPlay && !foundMaxwellBase) {
      this.spaces.push(colonySpace(VENUS_MAXWELL_BASE));
    }

    return this.spaces;
  }
  // SpaceId only allows 'm'+2 digits or a plain 2-3 digit number (see Types.ts's isSpaceId) --
  // no other letter prefix is valid, so unlike Moon's 'm' scheme, these are plain digits.
  // Starting at 200 keeps them clear of the Mars board's own numeric ids (which top out in the
  // 70s between the hex grid and its handful of off-grid colony spaces) even though, being a
  // fully separate Board instance, an actual collision wouldn't corrupt lookups either way.
  private static spaceId(id: number): SpaceId {
    return safeCast((200 + id).toString(), isSpaceId);
  }
}

class Row {
  constructor(private builder: Builder) {
  }

  land(...bonuses: Array<SpaceBonus>): this {
    this.builder.spaceTypes.push(SpaceType.LAND);
    this.builder.bonuses.push(bonuses);
    this.builder.reservedNames.push(undefined);
    this.builder.voided.push(false);
    return this;
  }

  gaslight(...bonuses: Array<SpaceBonus>): this {
    this.builder.spaceTypes.push(SpaceType.GASLIGHT);
    this.builder.bonuses.push(bonuses);
    this.builder.reservedNames.push(undefined);
    this.builder.voided.push(false);
    return this;
  }

  // The underlying type barely matters once reserved (build() always forces SpaceType.COLONY for
  // a reserved cell) -- LAND is just a reasonable placeholder for the "in this game but that card
  // isn't in play" fallback case, where the reservation gets ignored and the cell reverts to it.
  stratopolis(...bonuses: Array<SpaceBonus>): this {
    this.builder.spaceTypes.push(SpaceType.LAND);
    this.builder.bonuses.push(bonuses);
    this.builder.reservedNames.push('stratopolis');
    this.builder.voided.push(false);
    return this;
  }

  maxwellBase(...bonuses: Array<SpaceBonus>): this {
    this.builder.spaceTypes.push(SpaceType.LAND);
    this.builder.bonuses.push(bonuses);
    this.builder.reservedNames.push('maxwellBase');
    this.builder.voided.push(false);
    return this;
  }

  // Removes this hex from the board entirely -- matches the map editor's own void tool. Not used
  // by this file's own hard-coded default layout today, but the custom-definition path and a
  // hand-written default both read the same Builder.voided array, so this keeps the two paths
  // consistent and lets the map editor's "Copy as default board source" export round-trip a void.
  void(): this {
    this.builder.spaceTypes.push(SpaceType.LAND);
    this.builder.bonuses.push([]);
    this.builder.reservedNames.push(undefined);
    this.builder.voided.push(true);
    return this;
  }
}
