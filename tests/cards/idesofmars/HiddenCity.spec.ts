import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {HiddenCity} from '../../../src/server/cards/idesofmars/HiddenCity';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TileType} from '../../../src/common/TileType';
import {Phase} from '../../../src/common/Phase';
import {Resource} from '../../../src/common/Resource';
import {cast} from '../../../src/common/utils/utils';

describe('HiddenCity', () => {
  let card: HiddenCity;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new HiddenCity();
    [game, player, player2] = testGame(2);
    // Nobody can place a final greenery, so the final greenery loop falls through immediately.
    player.plants = 0;
    player2.plants = 0;
    // Production can't go below 0, so the card's own -1 energy step needs a starting cushion.
    player.production.add(Resource.ENERGY, 1);
  });

  it('requires 2 Mars tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {mars: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('changes production on play', () => {
    const energy = player.production.energy;
    const megacredits = player.production.megacredits;
    card.play(player);
    expect(player.production.energy).to.eq(energy - 1);
    expect(player.production.megacredits).to.eq(megacredits + 2);
  });

  it('scores 1 flat victory point', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('places a City tile after the final greenery phase but before end-of-game scoring', () => {
    player.playedCards.push(card);

    game.takeNextFinalGreeneryAction();

    const selectSpace = cast(player.getWaitingFor(), SelectSpace);
    const space = selectSpace.spaces[0];
    // Go through player.process (not selectSpace.cb directly) so the queued
    // resolveEndOfGameCardEffects continuation actually runs afterward.
    player.process({type: 'space', spaceId: space.id});

    expect(space.tile?.tileType).to.eq(TileType.CITY);
    expect(space.tile?.card).to.eq(card.name);
    // The whole end-of-game sequence (scoring included) has since completed.
    expect(game.phase).to.eq(Phase.END);
  });

  it('resolves at most once, even if Game.ts\'s resolution loop calls the hook again', () => {
    player.playedCards.push(card);

    card.onFinalGreeneryPlacementComplete(player);
    expect(card.data).is.true;
    const queuedAfterFirstCall = game.deferredActions.length;
    expect(queuedAfterFirstCall).to.be.greaterThan(0);

    // A second call (Game.resolveEndOfGameCardEffects may invoke this more than once while
    // deferred actions drain) must not queue a second placement.
    card.onFinalGreeneryPlacementComplete(player);
    expect(game.deferredActions.length).to.eq(queuedAfterFirstCall);
  });
});
