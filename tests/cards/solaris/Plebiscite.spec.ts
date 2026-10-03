import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {Plebiscite} from '../../../src/server/cards/solaris/Plebiscite';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {SelectParty} from '../../../src/server/inputs/SelectParty';
import {forcePartiesInPlay} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('Plebiscite', () => {
  let card: Plebiscite;
  let player: TestPlayer;
  let redPlayer: TestPlayer;
  let game: IGame;
  let turmoil: Turmoil;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SCIENTISTS, PartyName.POPULISTS);
    card = new Plebiscite();
    [game, player, redPlayer] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
    turmoil = game.turmoil!;
    // Clear whatever leaders random setup produced so tests are deterministic.
    turmoil.parties.forEach((party) => {
      party.delegates.clear();
      party.partyLeader = undefined;
    });
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play unless Populists rule or you have 2 delegates there', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.SCIENTISTS);
    turmoil.getPartyByName(PartyName.SCIENTISTS).sendDelegate(redPlayer, game);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('cannot play if no party has a leader other than the playing player', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.POPULISTS);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('ousts the leader of the chosen party and installs the playing player instead', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.POPULISTS);
    const scientists = turmoil.getPartyByName(PartyName.SCIENTISTS);
    scientists.sendDelegate(redPlayer, game);
    expect(scientists.partyLeader).to.eq(redPlayer);

    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;

    const selectParty = cast(card.play(player), SelectParty);
    expect(selectParty.parties).to.include(PartyName.SCIENTISTS);

    selectParty.cb(PartyName.SCIENTISTS);

    expect(scientists.partyLeader).to.eq(player);
    // The ousted leader remains an ordinary delegate of the party.
    expect(scientists.delegates.count(redPlayer)).to.eq(1);
  });
});
