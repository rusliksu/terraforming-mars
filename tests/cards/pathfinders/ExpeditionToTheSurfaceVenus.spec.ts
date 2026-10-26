import {expect} from 'chai';
import {ExpeditionToTheSurfaceVenus} from '../../../src/server/cards/pathfinders/ExpeditionToTheSurfaceVenus';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, setRulingParty, setVenusScaleLevel} from '@tests/TestingUtils';
import {PartyName} from '@/common/turmoil/PartyName';
import {Payment} from '@/common/inputs/Payment';
import {VenusAllies} from '@/server/cards/prelude2/VenusAllies';

describe('ExpeditiontotheSurfaceVenus', () => {
  let card: ExpeditionToTheSurfaceVenus;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ExpeditionToTheSurfaceVenus();
    [game, player] = testGame(1);
  });

  it('resolves the planetary Venus bonus with insufficient money for both Reds payments', () => {
    [game, player] = testGame(2, {venusNextExtension: true, turmoilExtension: true, pathfindersExpansion: true});
    setVenusScaleLevel(game, 6);
    setRulingParty(game, PartyName.REDS, 'rp01');
    game.pathfindersData!.venus = 7;
    player.playedCards.push(new VenusAllies());
    player.megaCredits = 19;
    const initialTR = player.terraformRating;

    expect(player.canPlay(card)).is.true;
    player.playCard(card, Payment.of({megacredits: 16}));
    runAllActions(game);

    expect(game.getVenusScaleLevel()).eq(10);
    expect(player.megaCredits).eq(2);
    expect(player.terraformRating).eq(initialTR + 1);
  });

  it('play', () => {
    player.cardsInHand = [];
    expect(player.terraformRating).eq(14);

    card.play(player);

    expect(player.cardsInHand).has.lengthOf(2);
    player.production.override({energy: 1});
    expect(player.terraformRating).eq(15);
    expect(game.getVenusScaleLevel()).eq(2);
    expect(player.megaCredits).eq(1);

    player.megaCredits = 0;
    player.tagsForTest = {venus: 1};
    card.play(player);
    expect(player.megaCredits).eq(2);

    player.megaCredits = 0;
    player.tagsForTest = {venus: 5};
    card.play(player);
    expect(player.megaCredits).eq(6);

    player.megaCredits = 0;
    player.tagsForTest = {venus: 1, wild: 2};
    card.play(player);
    expect(player.megaCredits).eq(4);
  });
});
