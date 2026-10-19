import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {InsectPollinators} from '../../../src/server/cards/idesofmars/InsectPollinators';
import {ConvertPlants} from '../../../src/server/cards/base/standardActions/ConvertPlants';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {addCity, addGreenery, setOxygenLevel} from '../../TestingUtils';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('InsectPollinators', () => {
  let card: InsectPollinators;
  let convertPlants: ConvertPlants;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new InsectPollinators();
    convertPlants = new ConvertPlants();
    [game, player] = testGame(1);
  });

  it('requires at least 4% oxygen', () => {
    expect(card.canPlay(player)).is.false;
    setOxygenLevel(game, 4);
    expect(card.canPlay(player)).is.true;
  });

  it('does not discount the standard greenery cost without the card in play', () => {
    player.plants = 7;
    expect(convertPlants.canAct(player)).is.false;
  });

  it('discounts a greenery placed next to one of the player\'s own greeneries by 1 plant', () => {
    player.playedCards.push(card);
    const greenerySpace = addGreenery(player);
    const adjacentSpace = game.board.getAdjacentSpaces(greenerySpace)
      .find((space) => game.board.getAvailableSpacesForGreenery(player).includes(space));
    expect(adjacentSpace).is.not.undefined;

    player.plants = 7;
    expect(convertPlants.canAct(player)).is.true;

    const selectSpace = cast(convertPlants.action(player), SelectSpace);
    selectSpace.cb(adjacentSpace!);

    expect(player.plants).to.eq(0);
  });

  it('does not discount a greenery placed next to a non-greenery tile of the player\'s own', () => {
    player.playedCards.push(card);
    // Standard placement rules require a greenery to be adjacent to a tile the player
    // already owns; owning only a city (no greenery) exercises that requirement while
    // keeping every available space non-adjacent to any greenery of the player's own.
    addCity(player);

    player.plants = 8;
    const selectSpace = cast(convertPlants.action(player), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);

    expect(player.plants).to.eq(0);
  });
});
