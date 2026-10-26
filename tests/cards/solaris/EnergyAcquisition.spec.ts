import {expect} from 'chai';
import {EnergyAcquisition} from '../../../src/server/cards/solaris/EnergyAcquisition';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('EnergyAcquisition', () => {
  let card: EnergyAcquisition;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    card = new EnergyAcquisition();
    restoreShuffle = forcePartiesInPlay(PartyName.EMPOWER);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('Cannot play without Empower', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('Can play when Empower rules', () => {
    setRulingParty(game, PartyName.EMPOWER);
    expect(card.canPlay(player)).is.true;
  });

  it('play gains 6 energy', () => {
    setRulingParty(game, PartyName.EMPOWER);
    player.energy = 0;
    card.play(player);
    expect(player.energy).to.eq(6);
  });
});
