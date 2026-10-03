import {expect} from 'chai';
import {WellnessDeluxe} from '../../../src/server/cards/sillyfication/WellnessDeluxe';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {addOcean, runAllActions, setTemperature} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('WellnessDeluxe', () => {
  let card: WellnessDeluxe;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new WellnessDeluxe();
    [game, player, player2] = testGame(2);
    player.playedCards.push(card);
  });

  it('starts with 32 M€, 4 heat, and no production bonus', () => {
    expect(card.startingMegaCredits).to.eq(32);
    card.play(player);
    runAllActions(game);
    expect(player.production.megacredits).to.eq(0);
    expect(player.heat).to.eq(4);
  });

  it('placing your own ocean gains 1 heat production and 2 heat', () => {
    addOcean(player, '06');
    runAllActions(game);

    expect(player.production.heat).to.eq(1);
    expect(player.heat).to.eq(2);
  });

  it('another player placing an ocean gains you 2 heat but no production', () => {
    addOcean(player2, '06');
    runAllActions(game);

    expect(player.production.heat).to.eq(0);
    expect(player.heat).to.eq(2);
    expect(player2.heat).to.eq(0);
  });

  it('raising the temperature yourself gains 1 M€ per step', () => {
    setTemperature(game, -8);
    player.megaCredits = 0;

    game.increaseTemperature(player, 2);

    expect(player.megaCredits).to.eq(2);
  });

  it('does not gain M€ when another player raises the temperature', () => {
    setTemperature(game, -8);
    player.megaCredits = 0;

    game.increaseTemperature(player2, 1);

    expect(player.megaCredits).to.eq(0);
  });
});
