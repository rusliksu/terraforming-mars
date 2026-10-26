import {expect} from 'chai';
import {TestPlayer} from '../TestPlayer';
import {testGame} from '../TestGame';
import {IGame} from '../../src/server/IGame';
import {runAllActions} from '../TestingUtils';
import {DistributeIndustryResources} from '../../src/server/industries/DistributeIndustryResources';
import {SelectSpace} from '../../src/server/inputs/SelectSpace';
import {Resource} from '../../src/common/Resource';
import {SpaceBonus} from '../../src/common/boards/SpaceBonus';
import {TileType} from '../../src/common/TileType';
import {cast} from '../../src/common/utils/utils';

describe('DistributeIndustryResources', () => {
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    [game, player, player2] = testGame(2);
  });

  it('splits a 4-count distribution across two different empty spaces', () => {
    const origin = game.board.getAvailableSpacesOnLand(player)[0];
    game.defer(new DistributeIndustryResources(player, Resource.HEAT, 4, origin));
    runAllActions(game);

    const first = cast(player.popWaitingFor(), SelectSpace);
    const space1 = first.spaces[0];
    const space1BonusBefore = space1.bonus.filter((b) => b === SpaceBonus.HEAT).length;
    cast(first.cb(space1), undefined);
    expect(space1.bonus.filter((b) => b === SpaceBonus.HEAT).length).eq(space1BonusBefore + 2);

    runAllActions(game);
    const second = cast(player.popWaitingFor(), SelectSpace);
    expect(second.spaces).does.not.contain(space1);
    const space2 = second.spaces[0];
    const space2BonusBefore = space2.bonus.filter((b) => b === SpaceBonus.HEAT).length;
    cast(second.cb(space2), undefined);
    expect(space2.bonus.filter((b) => b === SpaceBonus.HEAT).length).eq(space2BonusBefore + 2);

    runAllActions(game);
    cast(player.popWaitingFor(), undefined);
  });

  it('a count-1 distribution (Wild) grants the full amount to a single space', () => {
    const origin = game.board.getAvailableSpacesOnLand(player)[0];
    game.defer(new DistributeIndustryResources(player, Resource.PLANTS, 1, origin));
    runAllActions(game);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const space = selectSpace.spaces[0];
    const bonusBefore = space.bonus.filter((b) => b === SpaceBonus.PLANT).length;
    cast(selectSpace.cb(space), undefined);
    expect(space.bonus.filter((b) => b === SpaceBonus.PLANT).length).eq(bonusBefore + 1);

    runAllActions(game);
    cast(player.popWaitingFor(), undefined);
  });

  it('grants resources directly to the owner of an already-tiled space, instead of depositing a bonus', () => {
    const origin = game.board.getAvailableSpacesOnLand(player)[0];
    const ownedSpace = game.board.getAdjacentSpaces(origin)[0];
    game.addTile(player2, ownedSpace, {tileType: TileType.GREENERY});
    const bonusBefore = ownedSpace.bonus.length;
    const steelBefore = player2.steel;

    game.defer(new DistributeIndustryResources(player, Resource.STEEL, 1, origin));
    runAllActions(game);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    cast(selectSpace.cb(ownedSpace), undefined);

    expect(player2.steel).eq(steelBefore + 1);
    expect(ownedSpace.bonus.length).eq(bonusBefore);

    runAllActions(game);
    cast(player.popWaitingFor(), undefined);
  });
});
