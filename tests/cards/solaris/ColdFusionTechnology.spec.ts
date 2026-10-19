import {expect} from 'chai';
import {ColdFusionTechnology} from '../../../src/server/cards/solaris/ColdFusionTechnology';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Resource} from '../../../src/common/Resource';

describe('ColdFusionTechnology', () => {
  let card: ColdFusionTechnology;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    card = new ColdFusionTechnology();
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
    // Decreasing Heat production 2 steps requires having at least 2 to give up.
    player.production.add(Resource.HEAT, 2);
    expect(card.canPlay(player)).is.true;
  });

  it('play adjusts heat and energy production', () => {
    setRulingParty(game, PartyName.EMPOWER);
    player.production.override({heat: 3, energy: 0});
    card.play(player);
    expect(player.production.heat).to.eq(1);
    expect(player.production.energy).to.eq(5);
  });
});
