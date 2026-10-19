import {expect} from 'chai';
import {MartianAgriculture} from '../../../src/server/cards/solaris/MartianAgriculture';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('MartianAgriculture', () => {
  let card: MartianAgriculture;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    card = new MartianAgriculture();
    restoreShuffle = forcePartiesInPlay(PartyName.SPOME);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true, moonExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('Cannot play without Spome', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('Can play when Spome rules', () => {
    setRulingParty(game, PartyName.SPOME);
    expect(card.canPlay(player)).is.true;
  });

  it('play increases plant production and TR', () => {
    setRulingParty(game, PartyName.SPOME);
    const tr = player.terraformRating;
    card.play(player);
    expect(player.production.plants).to.eq(5);
    expect(player.terraformRating).to.eq(tr + 1);
  });
});
