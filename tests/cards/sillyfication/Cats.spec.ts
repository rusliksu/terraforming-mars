import {expect} from 'chai';
import {Cats} from '../../../src/server/cards/sillyfication/Cats';
import {Birds} from '../../../src/server/cards/base/Birds';
import {Penguins} from '../../../src/server/cards/promo/Penguins';
import {TileType} from '../../../src/common/TileType';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {cast} from '../../../src/common/utils/utils';
import {runAllActions} from '../../TestingUtils';

describe('Cats', () => {
  let card: Cats;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;

  beforeEach(() => {
    card = new Cats();
    [game, player, player2, player3] = testGame(3);
    player.playedCards.push(card);
  });

  it('starts with 1 animal on play', () => {
    card.bespokePlay(player);
    expect(card.resourceCount).to.eq(1);
  });

  it('steals an animal from the placer\'s card when a city tile is placed', () => {
    const birds = new Birds();
    player2.playedCards.push(birds);
    player2.addResourceTo(birds, 3);

    const space = game.board.getAvailableSpacesForCity(player2)[0];
    game.addCity(player2, space);
    runAllActions(game);

    expect(space.tile?.tileType).to.eq(TileType.CITY);
    expect(birds.resourceCount).to.eq(2);
    expect(card.resourceCount).to.eq(1);
  });

  it('offers a choice when the placer has more than one card that could be stolen from', () => {
    const birds1 = new Birds();
    const penguins = new Penguins();
    player2.playedCards.push(birds1, penguins);
    player2.addResourceTo(birds1, 3);
    player2.addResourceTo(penguins, 2);

    const space = game.board.getAvailableSpacesForCity(player2)[0];
    game.addCity(player2, space);
    runAllActions(game);

    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.cards).to.have.length(2);
    selectCard.cb([birds1]);
    runAllActions(game);

    expect(birds1.resourceCount).to.eq(2);
    expect(penguins.resourceCount).to.eq(2);
    expect(card.resourceCount).to.eq(1);
  });

  it('only steals from the player who placed the city, not other players', () => {
    const birds2 = new Birds();
    player2.playedCards.push(birds2);
    player2.addResourceTo(birds2, 3);
    const penguins3 = new Penguins();
    player3.playedCards.push(penguins3);
    player3.addResourceTo(penguins3, 3);

    const space = game.board.getAvailableSpacesForCity(player3)[0];
    game.addCity(player3, space);
    runAllActions(game);

    // player3 placed the city and is the only eligible target - player2's animal is untouched.
    expect(penguins3.resourceCount).to.eq(2);
    expect(birds2.resourceCount).to.eq(3);
    expect(card.resourceCount).to.eq(1);
  });

  it('gains an animal directly when the placer has none, even if another player does', () => {
    const birds2 = new Birds();
    player2.playedCards.push(birds2);
    player2.addResourceTo(birds2, 3);

    // player3 places the city but has no animal resource anywhere - player2's is not a valid target.
    const space = game.board.getAvailableSpacesForCity(player3)[0];
    game.addCity(player3, space);
    runAllActions(game);

    expect(birds2.resourceCount).to.eq(3);
    expect(card.resourceCount).to.eq(1);
  });

  it('steals from its own owner\'s other card when the owner places their own city', () => {
    const birds = new Birds();
    player.playedCards.push(birds);
    player.addResourceTo(birds, 3);

    const space = game.board.getAvailableSpacesForCity(player)[0];
    game.addCity(player, space);
    runAllActions(game);

    expect(birds.resourceCount).to.eq(2);
    expect(card.resourceCount).to.eq(1);
  });

  it('gains an animal directly when no player has any animal resource to steal', () => {
    const space = game.board.getAvailableSpacesForCity(player)[0];
    game.addCity(player, space);
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);
  });

  it('does not steal from itself when it is the only card holding an animal', () => {
    // Regression: Cats itself is a valid RemoveResourcesFromCard target once it holds an
    // animal, so without excluding itself it would "steal" from itself and hand the animal
    // right back, netting zero instead of the guaranteed +1.
    card.bespokePlay(player);
    expect(card.resourceCount).to.eq(1);

    const space = game.board.getAvailableSpacesForCity(player)[0];
    game.addCity(player, space);
    runAllActions(game);

    expect(card.resourceCount).to.eq(2);
  });
});
