import {expect} from 'chai';
import {VenusianInfrastructures} from '../../../src/server/cards/venusPhase2/VenusianInfrastructures';
import {AsteroidMine} from '../../../src/server/cards/highOrbit/AsteroidMine';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, setVenusScaleLevel} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';

describe('VenusianInfrastructures', () => {
  let card: VenusianInfrastructures;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VenusianInfrastructures();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    player.playedCards.push(card);
  });

  it('requires Venus 12%', () => {
    expect(card.canPlay(player)).is.false;
    setVenusScaleLevel(game, 12);
    expect(card.canPlay(player)).is.true;
  });

  it('spends 1 ore from any card to add 2 floaters to this card', () => {
    const asteroidMine = new AsteroidMine();
    asteroidMine.resourceCount = 1;
    player.playedCards.push(asteroidMine);

    card.action(player);
    runAllActions(game);

    expect(asteroidMine.resourceCount).to.eq(0);
    expect(card.resourceCount).to.eq(2);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
