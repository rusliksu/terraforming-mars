import {expect} from 'chai';
import {RedistributionOfWealth} from '../../../src/server/cards/solaris/RedistributionOfWealth';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty, runAllActions} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Loan} from '../../../src/server/cards/prelude/Loan';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';
import {Resource} from '../../../src/common/Resource';

describe('RedistributionOfWealth', () => {
  let card: RedistributionOfWealth;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    card = new RedistributionOfWealth();
    restoreShuffle = forcePartiesInPlay(PartyName.POPULISTS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true, preludeExtension: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('Cannot play without Populists', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('Can play when Populists rule', () => {
    setRulingParty(game, PartyName.POPULISTS);
    // Decreasing Titanium production 1 step requires having at least 1 to give up.
    player.production.add(Resource.TITANIUM, 1);
    expect(card.canPlay(player)).is.true;
  });

  it('Can play with 2 delegates', () => {
    const populists = game.turmoil!.getPartyByName(PartyName.POPULISTS);
    populists.delegates.add(player, 2);
    player.production.add(Resource.TITANIUM, 1);
    expect(card.canPlay(player)).is.true;
  });

  it('play decreases titanium production and M€, then draws and plays a prelude', () => {
    setRulingParty(game, PartyName.POPULISTS);
    player.production.add(Resource.TITANIUM, 2);
    player.megaCredits = 10;

    const loan = new Loan();
    game.preludeDeck.drawPile.push(loan);

    const output = card.play(player);
    runAllActions(game);

    expect(player.production.titanium).to.eq(1);
    expect(player.megaCredits).to.eq(9);

    const selectCard = cast(output, SelectCard);
    expect(selectCard.cards).to.contain(loan);
    selectCard.cb([loan]);
    runAllActions(game);

    expect(player.playedCards.get(loan.name)).to.exist;
  });
});
