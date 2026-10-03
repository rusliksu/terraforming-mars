import {expect} from 'chai';
import {WanderingStationHermes} from '../../../src/server/cards/solaris/WanderingStationHermes';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('WanderingStationHermes', () => {
  let card: WanderingStationHermes;
  let game: IGame;
  let player: TestPlayer;

  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SPOME);
    card = new WanderingStationHermes();
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true, moonExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without Spome ruling or 2 delegates', () => {
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.SPOME);
    expect(card.canPlay(player)).is.true;
  });

  it('raises TR 1 step, and is a no-op production bonus with no tags', () => {
    setRulingParty(game, PartyName.SPOME);
    const trBefore = player.terraformRating;
    const productionBefore = player.production.megacredits;

    card.play(player);

    expect(player.terraformRating).to.eq(trBefore + 1);
    expect(player.production.megacredits).to.eq(productionBefore);
  });

  it('increases M€ production by the count of the player\'s lowest owned tag', () => {
    setRulingParty(game, PartyName.SPOME);
    // Fewest owned tag (among tags with at least 1) is plant, at 1.
    player.tagsForTest = {jovian: 3, plant: 1, earth: 5};
    const productionBefore = player.production.megacredits;

    card.play(player);

    expect(player.production.megacredits).to.eq(productionBefore + 1);
  });
});
