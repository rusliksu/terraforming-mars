import {expect} from 'chai';
import {VenusianHeatExchangers} from '../../../src/server/cards/corporatebetterments/VenusianHeatExchangers';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions, setVenusScaleLevel, churn} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';

describe('VenusianHeatExchangers', () => {
  let card: VenusianHeatExchangers;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VenusianHeatExchangers();
    [game, player] = testGame(2, {venusNextExtension: true});
    setVenusScaleLevel(game, 14);
    player.playedCards.push(card);
  });

  it('requires 14% Venus', () => {
    setVenusScaleLevel(game, 12);
    expect(card.canPlay(player)).is.false;
    setVenusScaleLevel(game, 14);
    expect(card.canPlay(player)).is.true;
  });

  it('decreases heat production 2 steps to raise TR 1 step', () => {
    player.production.override({heat: 2});
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    dirigibles.resourceCount = 2;
    const trBefore = player.terraformRating;

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    orOptions.options[0].cb();
    runAllActions(game);

    expect(player.production.heat).to.eq(0);
    expect(player.terraformRating).to.eq(trBefore + 1);
    expect(dirigibles.resourceCount).to.eq(2); // untouched: the other option was chosen.
  });

  it('auto-applies the only executable option when heat production is too low for the TR option', () => {
    player.production.override({heat: 1});
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    dirigibles.resourceCount = 2;

    card.action(player);
    runAllActions(game);

    expect(dirigibles.resourceCount).to.eq(0);
    expect(player.production.heat).to.eq(3);
  });

  it('removes 2 floaters from any card to raise heat production 2 steps', () => {
    player.production.override({heat: 2});
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    dirigibles.resourceCount = 2;

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    orOptions.options[1].cb();
    runAllActions(game);

    expect(dirigibles.resourceCount).to.eq(0);
    expect(player.production.heat).to.eq(4);
  });
});
