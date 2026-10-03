import {expect} from 'chai';
import {FirstManMonument} from '../../../src/server/cards/solaris/FirstManMonument';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {SelectParty} from '../../../src/server/inputs/SelectParty';
import {cast} from '../../../src/common/utils/utils';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';

describe('FirstManMonument', () => {
  let card: FirstManMonument;
  let game: IGame;
  let player: TestPlayer;

  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.CENTRISTS, PartyName.MARS, PartyName.GREENS);
    card = new FirstManMonument();
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without Centrists ruling or 2 delegates', () => {
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.CENTRISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('raises TR and sends 1 delegate to each of 2 distinct parties', () => {
    setRulingParty(game, PartyName.CENTRISTS);
    const turmoil = Turmoil.getTurmoil(game);
    const trBefore = player.terraformRating;
    const delegatesBefore = player.totalDelegatesPlaced;

    const first = cast(card.play(player), SelectParty);
    const firstParty = first.parties[0];
    const second = cast(first.cb(firstParty), SelectParty);
    expect(second.parties).to.not.include(firstParty);
    const secondParty = second.parties[0];
    second.cb(secondParty);

    expect(player.terraformRating).to.eq(trBefore + 1);
    expect(player.totalDelegatesPlaced).to.eq(delegatesBefore + 2);
    expect(turmoil.getPartyByName(firstParty).delegates.count(player)).to.be.greaterThan(0);
    expect(turmoil.getPartyByName(secondParty).delegates.count(player)).to.be.greaterThan(0);
  });
});
