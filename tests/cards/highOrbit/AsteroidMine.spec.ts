import {expect} from 'chai';
import {AsteroidMine} from '../../../src/server/cards/highOrbit/AsteroidMine';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {churn, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('AsteroidMine', () => {
  let card: AsteroidMine;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new AsteroidMine();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('adds 2 ore to this card (the only Infrastructure card able to hold ore)', () => {
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(card.resourceCount).to.eq(2);
  });

  it('removes 2 ore from this card to gain 1 energy and 1 heat', () => {
    player.addResourceTo(card, 2);

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    expect(orOptions.options).has.lengthOf(2);

    orOptions.options[1].cb(undefined);

    expect(card.resourceCount).to.eq(0);
    expect(player.energy).to.eq(1);
    expect(player.heat).to.eq(1);
  });
});
