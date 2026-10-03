import {expect} from 'chai';
import {Insurance} from '../../../src/server/cards/sillyfication/Insurance';
import {IGame} from '../../../src/server/IGame';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('Insurance', () => {
  let card: Insurance;
  let player: TestPlayer;
  let game: IGame;
  let turmoil: Turmoil;

  beforeEach(() => {
    card = new Insurance();
    [game, player] = testGame(2, {turmoilExtension: true});
    turmoil = game.turmoil!;
  });

  it('requires Reds ruling or 2 delegates there', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.SCIENTISTS);
    expect(card.canPlay(player)).is.false;

    turmoil.rulingParty = turmoil.getPartyByName(PartyName.REDS);
    expect(card.canPlay(player)).is.true;
  });

  it('gains 1 M€ production per step your TR is below 20', () => {
    player.terraformRating = 14;
    player.production.override({megacredits: 0});

    card.bespokePlay(player);

    expect(player.production.megacredits).to.eq(6);
  });

  it('gains nothing when TR is 20 or higher', () => {
    player.terraformRating = 22;
    player.production.override({megacredits: 0});

    card.bespokePlay(player);

    expect(player.production.megacredits).to.eq(0);
  });
});
