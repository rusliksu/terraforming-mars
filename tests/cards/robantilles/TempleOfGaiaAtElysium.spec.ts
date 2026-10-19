import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {addGreenery, setRulingParty} from '../../TestingUtils';
import {TempleOfGaiaAtElysium} from '../../../src/server/cards/robantilles/TempleOfGaiaAtElysium';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';

describe('TempleOfGaiaAtElysium', () => {
  let card: TempleOfGaiaAtElysium;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new TempleOfGaiaAtElysium();
    [game, player, player2] = testGame(2, {turmoilExtension: true});
  });

  it('cannot play without the Greens ruling or 2 delegates there', () => {
    // Turmoil starts with Greens ruling by default, so switch away from it first.
    setRulingParty(game, PartyName.REDS);
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.GREENS);
    expect(card.canPlay(player)).is.true;
  });

  it('increases plant production 1 step for each greenery tile the player owns', () => {
    setRulingParty(game, PartyName.GREENS);

    card.play(player);
    expect(player.production.plants).to.eq(0);

    addGreenery(player);
    addGreenery(player);
    card.play(player);
    expect(player.production.plants).to.eq(2);
  });

  it('scores 1 VP for every 3 greenery tiles the player owns', () => {
    expect(card.getVictoryPoints(player)).to.eq(0);

    addGreenery(player);
    addGreenery(player);
    expect(card.getVictoryPoints(player)).to.eq(0);

    addGreenery(player);
    expect(card.getVictoryPoints(player)).to.eq(1);

    // Opponent's greeneries don't count.
    addGreenery(player2);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
