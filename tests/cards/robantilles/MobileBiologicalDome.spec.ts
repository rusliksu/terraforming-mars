import {expect} from 'chai';
import {MobileBiologicalDome} from '../../../src/server/cards/robantilles/MobileBiologicalDome';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, runAllActions, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('MobileBiologicalDome', () => {
  let card: MobileBiologicalDome;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SPOME);
    card = new MobileBiologicalDome();
    [game, player] = testGame(1, {turmoilExtension: true, robAntillesExpansion: true, morePartiesExpansion: true, moonExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without Spome ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.SPOME);
    expect(card.canPlay(player)).is.true;
  });

  it('places the Biological Dome tile on play', () => {
    setRulingParty(game, PartyName.SPOME);
    card.play(player);
    runAllActions(game);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const chosen = selectSpace.spaces[0];
    selectSpace.cb(chosen);

    expect(chosen.tile?.tileType).to.eq(TileType.BIOLOGICAL_DOME);
    expect(game.board.getSpaceByTileCard(card.name)).to.eq(chosen);
  });

  it('accumulates seeds and does nothing before the third generation', () => {
    const domeSpace = game.board.getAvailableSpacesOnLand(player)[0];
    game.simpleAddTile(player, domeSpace, {tileType: TileType.BIOLOGICAL_DOME, card: card.name});
    player.playedCards.push(card);

    card.onProductionPhase(player);
    expect(card.resourceCount).to.eq(1);
    expect(domeSpace.tile?.tileType).to.eq(TileType.BIOLOGICAL_DOME);

    card.onProductionPhase(player);
    expect(card.resourceCount).to.eq(2);
    expect(domeSpace.tile?.tileType).to.eq(TileType.BIOLOGICAL_DOME);
  });

  it('converts its area into a greenery and relocates once 3 seeds accumulate', () => {
    const domeSpace = game.board.getAvailableSpacesOnLand(player)[0];
    game.simpleAddTile(player, domeSpace, {tileType: TileType.BIOLOGICAL_DOME, card: card.name});
    player.playedCards.push(card);

    const oxygenBefore = game.getOxygenLevel();
    card.onProductionPhase(player);
    card.onProductionPhase(player);
    card.onProductionPhase(player);

    expect(card.resourceCount).to.eq(0);
    expect(domeSpace.tile?.tileType).to.eq(TileType.GREENERY);
    expect(game.getOxygenLevel()).to.eq(oxygenBefore + 1);

    const newDomeSpace = game.board.getSpaceByTileCard(card.name);
    expect(newDomeSpace).is.not.undefined;
    expect(newDomeSpace).is.not.eq(domeSpace);
    expect(game.board.getAdjacentSpaces(domeSpace)).to.include(newDomeSpace);
  });

  it('removes the tile permanently if there is no empty adjacent area to relocate to', () => {
    const domeSpace = game.board.getAvailableSpacesOnLand(player)[0];
    game.simpleAddTile(player, domeSpace, {tileType: TileType.BIOLOGICAL_DOME, card: card.name});
    player.playedCards.push(card);

    // Surround the dome with tiles so there's nowhere for it to relocate to.
    for (const adjacent of game.board.getAdjacentSpaces(domeSpace)) {
      game.simpleAddTile(player, adjacent, {tileType: TileType.GREENERY});
    }

    card.onProductionPhase(player);
    card.onProductionPhase(player);
    card.onProductionPhase(player);

    expect(domeSpace.tile?.tileType).to.eq(TileType.GREENERY);
    expect(game.board.getSpaceByTileCard(card.name)).is.undefined;
  });
});
