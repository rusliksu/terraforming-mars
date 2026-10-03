import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {PowerLinesHub} from '../../../src/server/cards/solaris/PowerLinesHub';
import {forcePartiesInPlay} from '../../TestingUtils';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {cast} from '../../../src/common/utils/utils';

describe('PowerLinesHub', () => {
  let card: PowerLinesHub;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;
  let game: IGame;
  let turmoil: Turmoil;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SCIENTISTS, PartyName.EMPOWER);
    card = new PowerLinesHub();
    [game, player, otherPlayer] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
    turmoil = game.turmoil!;
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play unless Empower rule or you have 2 delegates there', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.SCIENTISTS);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('can play when Empower are ruling', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.EMPOWER);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
  });

  it('play increases energy production for each Power tag opponents own, combined -- own tags do not count', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.EMPOWER);
    player.tagsForTest = {power: 3};
    otherPlayer.tagsForTest = {power: 2};

    cast(card.play(player), undefined);
    expect(player.production.energy).to.eq(2);
  });
});
