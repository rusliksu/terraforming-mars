import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {InvakCity} from '../../../src/server/cards/idesofmars/InvakCity';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TileType} from '../../../src/common/TileType';
import {Board} from '../../../src/server/boards/Board';
import {Resource} from '../../../src/common/Resource';
import {addGreenery, addCity} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('InvakCity', () => {
  let card: InvakCity;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new InvakCity();
    [game, player] = testGame(1);
    // Production can't go below 0, so the card's own -1 energy step needs a starting cushion.
    player.production.add(Resource.ENERGY, 1);
  });

  it('requires owning a greenery', () => {
    expect(card.canPlay(player)).is.false;
    addGreenery(player);
    expect(card.canPlay(player)).is.true;
  });

  it('changes production on play', () => {
    addGreenery(player);
    const energy = player.production.energy;
    const megacredits = player.production.megacredits;

    const selectSpace = cast(card.play(player), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);

    expect(player.production.energy).to.eq(energy - 1);
    expect(player.production.megacredits).to.eq(megacredits + 3);
  });

  it('scores 1 flat victory point', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('substitutes one of the player\'s own greeneries with the Invak City tile', () => {
    const greenerySpace = addGreenery(player);

    const selectSpace = cast(card.play(player), SelectSpace);
    expect(selectSpace.spaces).to.deep.eq([greenerySpace]);
    selectSpace.cb(greenerySpace);

    expect(greenerySpace.tile?.tileType).to.eq(TileType.INVAK_CITY);
    expect(greenerySpace.tile?.card).to.eq(card.name);
    expect(greenerySpace.player).to.eq(player);
  });

  it('counts as both a city and a greenery', () => {
    const greenerySpace = addGreenery(player);
    const selectSpace = cast(card.play(player), SelectSpace);
    selectSpace.cb(greenerySpace);

    expect(Board.isCitySpace(greenerySpace)).is.true;
    expect(Board.isGreenerySpace(greenerySpace)).is.true;
  });

  it('does not re-grant a space/placement bonus for the substitution', () => {
    const greenerySpace = addGreenery(player);
    const megacreditsBeforeSubstitution = player.megaCredits;

    const selectSpace = cast(card.play(player), SelectSpace);
    selectSpace.cb(greenerySpace);

    // Only the card's own +3 M€ production shows up next generation, not an extra placement bonus.
    expect(player.megaCredits).to.eq(megacreditsBeforeSubstitution);
  });

  it('grants 2 M€ when any tile is placed adjacent to it', () => {
    player.playedCards.push(card); // onTilePlaced only fires for cards in the tableau.
    const greenerySpace = addGreenery(player);
    const selectSpace = cast(card.play(player), SelectSpace);
    selectSpace.cb(greenerySpace);

    const adjacentSpace = game.board.getAdjacentSpaces(greenerySpace)[0];
    const megacreditsBefore = player.megaCredits;

    addCity(player, adjacentSpace.id);

    expect(player.megaCredits).to.eq(megacreditsBefore + 2);
  });

  it('does not grant the adjacency bonus for its own placement', () => {
    player.playedCards.push(card);
    const greenerySpace = addGreenery(player);
    const megacreditsBefore = player.megaCredits;

    const selectSpace = cast(card.play(player), SelectSpace);
    selectSpace.cb(greenerySpace);

    expect(player.megaCredits).to.eq(megacreditsBefore);
  });
});
