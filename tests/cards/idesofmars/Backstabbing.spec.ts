import {expect} from 'chai';
import {Backstabbing} from '../../../src/server/cards/idesofmars/Backstabbing';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Phase} from '../../../src/common/Phase';
import {runAllActions} from '../../TestingUtils';

describe('Backstabbing', () => {
  let card: Backstabbing;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;
  let turmoil: Turmoil;

  beforeEach(() => {
    card = new Backstabbing();
    [game, player, player2] = testGame(2, {turmoilExtension: true});
    turmoil = game.turmoil!;
  });

  it('requires the Turmoil extension', () => {
    const [soloGame, solo] = testGame(1);
    const soloCard = new Backstabbing();
    expect(soloGame.turmoil).is.undefined;
    expect(soloCard.canPlay(solo)).is.false;
  });

  it('makes the acting player chairman instead of the winning party\'s leader', () => {
    const reds = turmoil.getPartyByName(PartyName.REDS);
    turmoil.parties.forEach((party) => party.delegates.clear());
    turmoil.dominantParty = reds;

    // player2 has more delegates in REDS, so they would normally become party leader (and
    // therefore chairman).
    turmoil.sendDelegateToParty(player2, PartyName.REDS, game);
    turmoil.sendDelegateToParty(player2, PartyName.REDS, game);
    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    expect(reds.partyLeader).to.eq(player2);

    card.play(player);
    expect(game.backstabbingPlayer).to.eq(player.id);

    game.phase = Phase.SOLAR;
    turmoil.endGeneration(game);
    runAllActions(game);

    expect(turmoil.chairman).to.eq(player);
    // Consumed: it doesn't linger to affect a later generation.
    expect(game.backstabbingPlayer).is.undefined;
  });

  it('does nothing if the acting player has no delegate in the winning party', () => {
    const reds = turmoil.getPartyByName(PartyName.REDS);
    turmoil.parties.forEach((party) => party.delegates.clear());
    turmoil.dominantParty = reds;

    turmoil.sendDelegateToParty(player2, PartyName.REDS, game);

    card.play(player);

    game.phase = Phase.SOLAR;
    turmoil.endGeneration(game);
    runAllActions(game);

    expect(turmoil.chairman).to.eq(player2);
  });
});
