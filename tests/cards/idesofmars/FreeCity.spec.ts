import {expect} from 'chai';
import {FreeCity} from '../../../src/server/cards/idesofmars/FreeCity';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, forcePartiesInPlay} from '../../TestingUtils';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('FreeCity', () => {
  let card: FreeCity;
  let player: TestPlayer;
  let game: IGame;
  let turmoil: Turmoil;

  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SCIENTISTS, PartyName.POPULISTS);
    card = new FreeCity();
    [game, player] = testGame(2, {turmoilExtension: true, idesOfMarsExpansion: true, morePartiesExpansion: true});
    turmoil = game.turmoil!;
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play unless Populists rule or you have 2 delegates there', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.SCIENTISTS);
    expect(card.canPlay(player)).is.false;
  });

  it('can play when Populists are ruling', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.POPULISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('is worth 2 victory points', () => {
    expect(card.getVictoryPoints(player)).to.eq(2);
  });

  it('places a city tile that belongs to no player', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.POPULISTS);

    card.play(player);
    runAllActions(game);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const space = selectSpace.spaces[0];
    selectSpace.cb(space);
    runAllActions(game);

    expect(space.tile?.tileType).is.not.undefined;
    expect(space.player).is.undefined;
    expect(game.board.getCities(player)).is.empty;
  });
});
