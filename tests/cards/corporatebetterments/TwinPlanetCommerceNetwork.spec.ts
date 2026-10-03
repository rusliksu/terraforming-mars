import {expect} from 'chai';
import {TwinPlanetCommerceNetwork} from '../../../src/server/cards/corporatebetterments/TwinPlanetCommerceNetwork';
import {GanymedeColony} from '../../../src/server/cards/base/GanymedeColony';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('TwinPlanetCommerceNetwork', () => {
  let card: TwinPlanetCommerceNetwork;
  let game: IGame;
  let player: TestPlayer;
  let dirigibles: Dirigibles;

  beforeEach(() => {
    card = new TwinPlanetCommerceNetwork();
    [game, player] = testGame(2, {venusNextExtension: true});
    dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
  });

  it('requires at least 1 floater', () => {
    expect(card.canPlay(player)).is.false;
    dirigibles.resourceCount = 1;
    expect(card.canPlay(player)).is.true;
  });

  it('raises TR 1 step for each off-Mars city in play, and adds 3 floaters to any card', () => {
    dirigibles.resourceCount = 1;

    const ganymedeColony = new GanymedeColony();
    player.playedCards.push(ganymedeColony);
    ganymedeColony.play(player);

    const trBefore = player.terraformRating;

    card.play(player);
    runAllActions(game);

    expect(player.terraformRating).to.eq(trBefore + 1);
    expect(dirigibles.resourceCount).to.eq(4);
  });

  it('grants no TR when there is no off-Mars city in play', () => {
    dirigibles.resourceCount = 1;
    const trBefore = player.terraformRating;

    card.play(player);
    runAllActions(game);

    expect(player.terraformRating).to.eq(trBefore);
    expect(dirigibles.resourceCount).to.eq(4);
  });
});
