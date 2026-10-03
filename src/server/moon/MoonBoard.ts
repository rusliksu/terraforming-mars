import {Board} from '../boards/Board';
import {Space} from '../boards/Space';
import {IPlayer} from '../IPlayer';
import {SpaceBonus} from '../../common/boards/SpaceBonus';
import {SpaceType} from '../../common/boards/SpaceType';
import {NamedMoonSpace, NamedMoonSpaces} from '../../common/moon/NamedMoonSpaces';
import {SpaceId, isSpaceId, safeCast} from '../../common/Types';
import {GameOptions} from '../../server/game/GameOptions';
import {Random} from '../../common/utils/Random';
import {preservingShuffle} from '../../server/boards/BoardBuilder';

function colonySpace(id: SpaceId): Space {
  return {id, spaceType: SpaceType.COLONY, x: -1, y: -1, bonus: []};
}

export class MoonBoard extends Board {
  public getAvailableSpacesForMine(player: IPlayer): ReadonlyArray<Space> {
    const spaces = this.spaces.filter((space) => {
      const val = space.tile === undefined &&
        space.spaceType === SpaceType.LUNAR_MINE &&
        space.id !== NamedMoonSpaces.MARE_IMBRIUM &&
        space.id !== NamedMoonSpaces.MARE_SERENITATIS &&
        space.id !== NamedMoonSpaces.MARE_NUBIUM &&
        space.id !== NamedMoonSpaces.MARE_NECTARIS &&
        (space.player === undefined || space.player.id === player.id);
      return val;
    });
    return spaces;
  }

  public static newInstance(gameOptions: GameOptions, rng: Random): MoonBoard {
    const b = new Builder();
    const custom = gameOptions.customMoonBoard;

    if (custom !== undefined) {
      // A user-authored layout from the map editor (see SimpleCustomBoardDefinition.ts). Its
      // `spaces` are already in the same row-major order as the grid loop in Builder.build()
      // below (both derive from the same simpleBoardLayout('moon') shape), so this just supplies
      // the type/bonus/voided arrays that loop reads -- shuffling a player-authored layout
      // wouldn't make sense, so shuffleMapOption is ignored in this branch.
      for (const space of custom.spaces) {
        b.spaceTypes.push(space.spaceType);
        b.bonuses.push(space.bonus);
        b.voided.push(space.voided === true);
      }
    } else {
      const STEEL = SpaceBonus.STEEL;
      const DRAW_CARD = SpaceBonus.DRAW_CARD;
      const TITANIUM = SpaceBonus.TITANIUM;

      b.row(2).land().land(STEEL, DRAW_CARD).land().mine(TITANIUM);
      b.row(1).mine(TITANIUM, TITANIUM).mine(/* Mare Imbrium */).land(STEEL).land().land();
      b.row(0).mine().land(STEEL).land(STEEL, TITANIUM).mine(/* Mare Serenatis*/).mine(TITANIUM).land(STEEL, STEEL);
      b.row(0).land(STEEL).land().land().mine(TITANIUM).mine(TITANIUM);
      b.row(0).land().mine(TITANIUM).mine(/* Mare Nubium */).land().mine(/* Mare Nectaris */).land(STEEL);
      b.row(1).land().land(STEEL).land(STEEL).land(DRAW_CARD, DRAW_CARD).land(STEEL);
      b.row(2).land(DRAW_CARD, DRAW_CARD).mine(TITANIUM).mine(TITANIUM, TITANIUM).land();

      if (gameOptions.shuffleMapOption!== undefined && gameOptions.shuffleMapOption) {
        b.shuffle(rng,
          NamedMoonSpaces.MARE_IMBRIUM,
          NamedMoonSpaces.MARE_NECTARIS,
          NamedMoonSpaces.MARE_NUBIUM,
          NamedMoonSpaces.MARE_SERENITATIS);
      }
    }
    const spaces = b.build();
    return new MoonBoard(spaces);
  }
}

class Builder {
  y: number = -1;
  x: number = 0;
  spaceTypes: Array<SpaceType> = [];
  bonuses: Array<Array<SpaceBonus>> = [];
  // Parallel to spaceTypes/bonuses, one entry per grid position -- see build()'s loop, which still
  // increments idx (and thus the id counter) for a voided position, just skips pushing a Space for
  // it, so every OTHER cell keeps the exact 'm02'..'m36' id it would've had without the void --
  // MoonBoard.vue positions hexes by hand-tuned CSS keyed to that exact id, so a shifted id would
  // silently stop matching any rule.
  voided: Array<boolean> = [];
  spaces: Array<Space> = [];
  private idx: number = 0;

  public row(startX: number): Row {
    this.y++;
    this.x = startX;
    return new Row(this);
  }
  public colony() {
    this.spaceTypes.push(SpaceType.COLONY);
    this.bonuses.push([]);
  }
  public nextId(): SpaceId {
    this.idx++;
    const strId = this.idx.toString().padStart(2, '0');
    return safeCast('m' + strId, isSpaceId);
  }
  public build(): Array<Space> {
    this.spaces.push(colonySpace(NamedMoonSpaces.LUNA_TRADE_STATION));

    const tilesPerRow = [4, 5, 6, 5, 6, 5, 4];
    const idOffset = this.spaces.length + 1;
    let idx = 0;

    for (let row = 0; row < tilesPerRow.length; row++) {
      const tilesInThisRow = tilesPerRow[row];
      const xOffset = row === 3 ? 0 : 6 - tilesInThisRow; // Hack for central line 0-based x coord
      for (let i = 0; i < tilesInThisRow; i++) {
        // A voided cell doesn't exist on the board at all -- no Space is created for it -- but idx
        // (and so the id counter) still advances, keeping every later cell's id stable.
        if (this.voided[idx] === true) {
          idx++;
          continue;
        }
        const spaceId = idx + idOffset;
        const xCoordinate = xOffset + i;
        const space = {
          id: Builder.spaceId(spaceId),
          spaceType: this.spaceTypes[idx],
          x: xCoordinate,
          y: row,
          bonus: this.bonuses[idx],
        };
        this.spaces.push(space);
        idx++;
      }
    }

    this.spaces.push(colonySpace(NamedMoonSpaces.MOMENTUM_VIRIUM));
    return this.spaces;
  }
  public shuffle(rng: Random, ...preservedSpaceIds: Array<NamedMoonSpace>) {
    const preservedSpaces = [];
    for (const spaceId of preservedSpaceIds) {
      const idx = Number(spaceId.substring(1, 3));
      preservedSpaces.push(idx - 2);
    }
    preservedSpaces.sort((a, b) => a - b); // TODO(kberg): this can be removed.
    preservingShuffle(this.spaceTypes, preservedSpaces, rng);
    preservingShuffle(this.bonuses, preservedSpaces, rng);
    return;
  }
  private static spaceId(id: number): SpaceId {
    let strId = id.toString();
    if (id < 10) {
      strId = '0'+strId;
    }
    return safeCast('m'+strId, isSpaceId);
  }
}

class Row {
  constructor(private builder: Builder) {
  }

  land(...bonuses: SpaceBonus[]): this {
    this.builder.spaceTypes.push(SpaceType.LAND);
    this.builder.bonuses.push(bonuses);
    this.builder.voided.push(false);
    return this;
  }

  mine(...bonuses: SpaceBonus[]): this {
    this.builder.spaceTypes.push(SpaceType.LUNAR_MINE);
    this.builder.bonuses.push(bonuses);
    this.builder.voided.push(false);
    return this;
  }

  // Removes this hex from the board entirely -- matches the map editor's own void tool. Not used
  // by this file's own hard-coded default layout today; see the identical method on Venus Phase
  // 2's own Row class for why it exists anyway (keeps the custom-definition and hand-written
  // default paths reading the same Builder.voided array, and lets a "Copy as default board
  // source" export round-trip a void).
  void(): this {
    this.builder.spaceTypes.push(SpaceType.LAND);
    this.builder.bonuses.push([]);
    this.builder.voided.push(true);
    return this;
  }
}
