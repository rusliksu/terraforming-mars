import {expect} from 'chai';
import {VenusianFluctuatingPlants} from '../../../src/server/cards/corporatebetterments/VenusianFluctuatingPlants';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions, setVenusScaleLevel, churn} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';

describe('VenusianFluctuatingPlants', () => {
  let card: VenusianFluctuatingPlants;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VenusianFluctuatingPlants();
    [game, player] = testGame(2, {venusNextExtension: true});
    setVenusScaleLevel(game, 6);
    player.playedCards.push(card);
  });

  it('requires 6% Venus', () => {
    setVenusScaleLevel(game, 4);
    expect(card.canPlay(player)).is.false;
    setVenusScaleLevel(game, 6);
    expect(card.canPlay(player)).is.true;
  });

  it('adds 1 floater to any card for free', () => {
    player.plants = 3; // Both options are valid, so this is a genuine choice.

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    orOptions.options[0].cb();
    runAllActions(game);

    expect(player.plants).to.eq(3); // untouched: the other (paid) option was not chosen.
    expect(card.resourceCount).to.eq(1);
  });

  it('spends 3 plants to add 2 floaters to any card', () => {
    player.plants = 3;

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    orOptions.options[1].cb();
    runAllActions(game);

    expect(player.plants).to.eq(0);
    expect(card.resourceCount).to.eq(2);
  });

  it('auto-applies the free floater option when the player cannot afford the plants option', () => {
    player.plants = 2;

    churn(card.action(player), player);
    runAllActions(game);

    expect(card.resourceCount).to.eq(1);
  });

  it('scores 1 VP for every 2 floaters on this card', () => {
    card.resourceCount = 5;
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
