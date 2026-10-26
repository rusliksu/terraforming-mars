import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {CondensationPlant} from '../../../src/server/cards/solaris/CondensationPlant';
import {setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('CondensationPlant', () => {
  let card: CondensationPlant;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new CondensationPlant();
    [game, player] = testGame(2, {turmoilExtension: true});
  });

  it('cannot play unless Kelvinists rule or you have 2 delegates there', () => {
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('can play when Kelvinists are ruling', () => {
    setRulingParty(game, PartyName.KELVINISTS);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
  });

  it('doubles the standard end-of-generation Energy->Heat conversion', () => {
    player.playedCards.push(card);
    player.energy = 3;
    player.heat = 0;

    player.runProductionPhase();

    expect(player.heat).to.eq(6);
    expect(player.energy).to.eq(0);
  });

  it('does not affect a player without the card', () => {
    player.energy = 3;
    player.heat = 0;

    player.runProductionPhase();

    expect(player.heat).to.eq(3);
  });
});
