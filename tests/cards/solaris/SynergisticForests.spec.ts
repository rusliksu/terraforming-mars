import {expect} from 'chai';
import {SynergisticForests} from '../../../src/server/cards/solaris/SynergisticForests';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, addGreenery} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {TileType} from '../../../src/common/TileType';
import {BoardType} from '../../../src/server/boards/BoardType';

describe('SynergisticForests', () => {
  let card: SynergisticForests;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new SynergisticForests();
    [game, player, player2] = testGame(2, {turmoilExtension: true});
  });

  it('cannot play without Greens ruling or 2 delegates', () => {
    setRulingParty(game, PartyName.REDS);
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.GREENS);
    expect(card.canPlay(player)).is.true;
  });

  it('gains 1 plant when this player places a tile adjacent to their own greenery', () => {
    const greenerySpace = addGreenery(player);
    const adjacent = game.board.getAdjacentSpaces(greenerySpace)[0];

    const plantsBefore = player.plants;
    game.addCity(player, adjacent);
    card.onTilePlaced(player, player, adjacent, BoardType.MARS);

    expect(player.plants).to.eq(plantsBefore + 1);
  });

  it('does not gain a plant when there is no adjacent own greenery', () => {
    const space = game.board.getAvailableSpacesOnLand(player)[0];
    const plantsBefore = player.plants;
    game.addCity(player, space);
    card.onTilePlaced(player, player, space, BoardType.MARS);

    expect(player.plants).to.eq(plantsBefore);
  });

  it('does not trigger from another player\'s tile placement', () => {
    const greenerySpace = addGreenery(player);
    const adjacent = game.board.getAdjacentSpaces(greenerySpace)[0];

    const plantsBefore = player.plants;
    game.addCity(player2, adjacent);
    card.onTilePlaced(player, player2, adjacent, BoardType.MARS);

    expect(player.plants).to.eq(plantsBefore);
  });

  it('does not count a greenery tile owned by an opponent', () => {
    const greenerySpace = addGreenery(player2);
    const adjacent = game.board.getAdjacentSpaces(greenerySpace)[0];

    const plantsBefore = player.plants;
    game.addCity(player, adjacent);
    card.onTilePlaced(player, player, adjacent, BoardType.MARS);

    expect(player.plants).to.eq(plantsBefore);
    expect(TileType.GREENERY).to.eq(greenerySpace.tile?.tileType);
  });
});
