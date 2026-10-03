import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {fakeCard, runAllActions, setOxygenLevel} from '../../TestingUtils';
import {LivestockGiantDome} from '../../../src/server/cards/robantilles/LivestockGiantDome';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TileType} from '../../../src/common/TileType';
import {SpaceBonus} from '../../../src/common/boards/SpaceBonus';
import {CardType} from '../../../src/common/cards/CardType';
import {CardResource} from '../../../src/common/CardResource';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('LivestockGiantDome', () => {
  let card: LivestockGiantDome;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new LivestockGiantDome();
    [game, player] = testGame(2);
  });

  it('cannot play when oxygen exceeds 7%', () => {
    setOxygenLevel(game, 8);
    expect(card.canPlay(player)).is.false;
  });

  it('can play when oxygen is 7% or below', () => {
    setOxygenLevel(game, 7);
    expect(card.canPlay(player)).is.true;
  });

  it('places the Animal Dome tile next to no other tile, with a 1-Animal adjacency bonus', () => {
    card.play(player);
    runAllActions(game);

    const action = cast(player.popWaitingFor(), SelectSpace);
    const space = action.spaces[0];
    action.cb(space);

    expect(space.tile?.tileType).to.eq(TileType.ANIMAL_DOME);
    expect(space.adjacency?.bonus).to.deep.eq([SpaceBonus.ANIMAL]);
  });

  it('plays an Active Animal-collecting card from the deck for free, ignoring its cost and requirements', () => {
    const expensive = fakeCard({type: CardType.ACTIVE, resourceType: CardResource.ANIMAL, cost: 30});
    const nonMatchingTag = fakeCard();
    const nonMatchingType = fakeCard({type: CardType.AUTOMATED, resourceType: CardResource.ANIMAL});
    // Deck.draw() pops from the end of drawPile, so the last-pushed card is revealed first --
    // push the match last so the two non-matches get revealed (and discarded) before it.
    game.projectDeck.drawPile.push(expensive, nonMatchingType, nonMatchingTag);

    card.play(player);

    expect(player.playedCards.has(expensive.name)).is.true;
    expect(player.megaCredits).to.eq(0);
    expect(game.projectDeck.discardPile).to.include.members([nonMatchingTag, nonMatchingType]);
  });

  it('does nothing if no Active Animal-collecting card remains in the deck', () => {
    const nonMatch1 = fakeCard();
    const nonMatch2 = fakeCard({type: CardType.AUTOMATED, resourceType: CardResource.ANIMAL});
    game.projectDeck.drawPile = [nonMatch1, nonMatch2];
    game.projectDeck.discardPile = [];

    const playedCountBefore = player.playedCards.length;
    card.play(player);

    // Neither card is an Active Animal collector, so nothing gets played; no crash. (The deck's
    // self-shuffle-on-empty can reshuffle a discarded card back into drawPile mid-search, so this
    // doesn't assert on drawPile/discardPile's exact final split -- only that play was a no-op.)
    expect(player.playedCards).to.have.length(playedCountBefore);
    expect(player.playedCards.has(nonMatch1.name)).is.false;
    expect(player.playedCards.has(nonMatch2.name)).is.false;
  });
});
