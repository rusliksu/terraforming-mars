import {expect} from 'chai';
import {SomeAssemblyRequired} from '../../../src/server/cards/sillyfication/SomeAssemblyRequired';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TileType} from '../../../src/common/TileType';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {Tag} from '../../../src/common/cards/Tag';

describe('SomeAssemblyRequired', () => {
  let card: SomeAssemblyRequired;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SomeAssemblyRequired();
    [game, player, player2] = testGame(2);
  });

  it('has a building tag and a city tag', () => {
    expect(card.tags).to.deep.eq([Tag.BUILDING, Tag.CITY]);
  });

  it('places a city and makes every player discard a card', () => {
    player.cardsInHand = [new MicroCredits()];
    player2.cardsInHand = [new MicroCredits()];

    card.play(player);
    runAllActions(game);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    runAllActions(game);

    expect(selectSpace.spaces[0].tile?.tileType).to.eq(TileType.CITY);
    expect(player.cardsInHand).to.have.length(0);
    expect(player2.cardsInHand).to.have.length(0);
  });
});
