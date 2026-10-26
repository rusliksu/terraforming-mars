import {expect} from 'chai';
import {BiomassConversionPlant} from '../../../src/server/cards/robantilles/BiomassConversionPlant';
import {Ants} from '../../../src/server/cards/base/Ants';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('BiomassConversionPlant', () => {
  let card: BiomassConversionPlant;
  let player: TestPlayer;

  beforeEach(() => {
    card = new BiomassConversionPlant();
    [, player] = testGame(1);
  });

  it('decreases energy production on play', () => {
    player.production.override({energy: 2});
    card.play(player);
    expect(player.production.energy).eq(1);
  });

  it('cannot act without both 2 plants and a Microbe card in play', () => {
    player.plants = 2;
    expect(card.canAct(player)).is.false;

    const ants = new Ants();
    player.playedCards.push(ants);
    expect(card.canAct(player)).is.true;

    player.plants = 1;
    expect(card.canAct(player)).is.false;
  });

  it('spends 2 plants to add 3 microbes to a Microbe card', () => {
    player.plants = 2;
    const ants = new Ants();
    player.playedCards.push(ants);

    card.action(player);
    runAllActions(player.game);

    expect(player.plants).eq(0);
    expect(ants.resourceCount).eq(3);
  });
});
