import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {runAllActions, setTemperature} from '../../TestingUtils';
import {Reptiles} from '../../../src/server/cards/idesofmars/Reptiles';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';

describe('Reptiles', () => {
  let card: Reptiles;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Reptiles();
    [game, player] = testGame(2);
  });

  it('cannot play below 0°C', () => {
    setTemperature(game, -2);
    expect(card.canPlay(player)).is.false;
  });

  it('can play at 0°C or warmer', () => {
    setTemperature(game, 0);
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without 5 heat', () => {
    player.heat = 4;
    expect(card.canAct(player)).is.false;
  });

  it('spends 5 heat to add an animal to this card', () => {
    player.heat = 5;
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(player.heat).to.eq(0);
    expect(card.resourceCount).to.eq(1);
  });

  it('awards 1 VP per animal on this card', () => {
    player.addResourceTo(card, 2);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
