import {expect} from 'chai';
import {MartianCensus} from '../../../src/server/cards/solaris/MartianCensus';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay, addCity} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';

describe('MartianCensus', () => {
  let card: MartianCensus;
  let game: IGame;
  let player: TestPlayer;

  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.POPULISTS, PartyName.REDS);
    card = new MartianCensus();
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without Populists ruling or 2 delegates', () => {
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.POPULISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('increases M€ production for each party led, and gains M€ for each city', () => {
    setRulingParty(game, PartyName.POPULISTS);

    const turmoil = Turmoil.getTurmoil(game);
    const populists = turmoil.getPartyByName(PartyName.POPULISTS);
    const reds = turmoil.getPartyByName(PartyName.REDS);
    populists.partyLeader = player;
    reds.partyLeader = player;

    addCity(player);
    addCity(player);

    const productionBefore = player.production.megacredits;
    const megaCreditsBefore = player.megaCredits;

    card.play(player);

    expect(player.production.megacredits).to.eq(productionBefore + 2);
    expect(player.megaCredits).to.eq(megaCreditsBefore + 2);
  });

  it('is a no-op bonus when player leads no parties and owns no cities', () => {
    setRulingParty(game, PartyName.POPULISTS);

    const productionBefore = player.production.megacredits;
    const megaCreditsBefore = player.megaCredits;

    card.play(player);

    expect(player.production.megacredits).to.eq(productionBefore);
    expect(player.megaCredits).to.eq(megaCreditsBefore);
  });
});
