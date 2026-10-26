import {expect} from 'chai';
import {GreenhouseLights} from '../../../src/server/cards/robantilles/GreenhouseLights';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Resource} from '../../../src/common/Resource';

describe('GreenhouseLights', () => {
  let card: GreenhouseLights;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.EMPOWER);
    card = new GreenhouseLights();
    [game, player] = testGame(2, {turmoilExtension: true, robAntillesExpansion: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without Empower ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.EMPOWER);
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without energy production', () => {
    expect(card.canAct(player)).is.not.true;
  });

  it('converts 1 energy production into 1 plant production', () => {
    player.production.add(Resource.ENERGY, 1);
    expect(card.canAct(player)).is.true;

    card.action(player);
    expect(player.production.energy).to.eq(0);
    expect(player.production.plants).to.eq(1);
  });
});
