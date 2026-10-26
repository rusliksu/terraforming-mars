import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {StormSurgeBarrier} from '../../../src/server/cards/delta/StormSurgeBarrier';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {addOcean, addCity} from '../../TestingUtils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('StormSurgeBarrier', () => {
  let card: StormSurgeBarrier;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new StormSurgeBarrier();
    [game, player] = testGame(2, {deltaProjectExpansion: true});
  });

  it('cannot play without a tile adjacent to an ocean', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play with a city adjacent to an ocean', () => {
    const ocean = addOcean(player);
    const adjacentSpace = game.board.getAdjacentSpaces(ocean)[0];
    addCity(player, adjacentSpace.id);
    expect(card.canPlay(player)).is.true;
  });

  it('action gains 1 energy per own tile adjacent to an ocean', () => {
    player.playedCards.push(card);
    const ocean = addOcean(player);
    const adjacentSpace = game.board.getAdjacentSpaces(ocean)[0];
    addCity(player, adjacentSpace.id);
    player.energy = 0;

    expect(card.action(player)).is.undefined;

    expect(player.energy).eq(1);
  });

  it('offers a choice when both energy and Delta advance are possible', () => {
    player.playedCards.push(card);
    const ocean = addOcean(player);
    const adjacentSpace = game.board.getAdjacentSpaces(ocean)[0];
    addCity(player, adjacentSpace.id);
    player.energy = 1;
    player.tagsForTest = {building: 1};

    const orOptions = cast(card.action(player), OrOptions);
    expect(orOptions.options).has.length(2);
  });

  it('is a blue (Active) card', () => {
    expect(card.type).eq(CardType.ACTIVE);
  });
});
