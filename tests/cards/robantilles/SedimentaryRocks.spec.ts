import {expect} from 'chai';
import {SedimentaryRocks} from '../../../src/server/cards/robantilles/SedimentaryRocks';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {churn} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('SedimentaryRocks', () => {
  let card: SedimentaryRocks;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SedimentaryRocks();
    [game, player] = testGame(2);
  });

  it('places the Sediment special tile with a titanium adjacency bonus', () => {
    const selectSpace = cast(churn(card.play(player), player), SelectSpace);
    const space = selectSpace.spaces[0];
    selectSpace.cb(space);

    expect(space.tile?.tileType).to.eq(TileType.SEDIMENT);
    expect(space.player?.id).to.eq(player.id);
  });

  it('lets its owner cover the Sediment tile with a City tile later, ignoring the normal placement rules, and pays 3 M€', () => {
    const selectSpace = cast(churn(card.play(player), player), SelectSpace);
    const sedimentSpace = selectSpace.spaces[0];
    selectSpace.cb(sedimentSpace);

    // Surround the sediment space with another city, which would normally block a new city
    // from being placed adjacent to it -- Sedimentary Rocks explicitly ignores that rule.
    const adjacent = game.board.getAdjacentSpaces(sedimentSpace)[0];
    game.simpleAddTile(player, adjacent, {tileType: TileType.CITY});

    const citySpaces = game.board.getAvailableSpacesForCity(player);
    expect(citySpaces.some((space) => space.id === sedimentSpace.id)).is.true;

    const before = player.megaCredits;
    game.addTile(player, sedimentSpace, {tileType: TileType.CITY});
    expect(sedimentSpace.tile?.tileType).to.eq(TileType.CITY);
    expect(player.megaCredits - before).to.eq(3);
  });
});
