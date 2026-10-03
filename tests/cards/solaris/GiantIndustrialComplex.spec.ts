import {expect} from 'chai';
import {GiantIndustrialComplex} from '../../../src/server/cards/solaris/GiantIndustrialComplex';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('GiantIndustrialComplex', () => {
  let card: GiantIndustrialComplex;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GiantIndustrialComplex();
    [game, player] = testGame(1, {turmoilExtension: true});
  });

  it('Cannot play without Mars First', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('Can play when Mars First rules', () => {
    setRulingParty(game, PartyName.MARS);
    expect(card.canPlay(player)).is.true;
  });

  it('play increases steel, titanium, energy, and heat production', () => {
    setRulingParty(game, PartyName.MARS);
    player.production.override({});
    card.play(player);
    expect(player.production.steel).to.eq(1);
    expect(player.production.titanium).to.eq(1);
    expect(player.production.energy).to.eq(1);
    expect(player.production.heat).to.eq(1);
  });
});
