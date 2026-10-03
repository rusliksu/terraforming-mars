import {expect} from 'chai';
import {PropellantDepot} from '../../../src/server/cards/highOrbit/PropellantDepot';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {churn, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('PropellantDepot', () => {
  let card: PropellantDepot;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PropellantDepot();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('cannot act without energy or stored ore', () => {
    expect(card.canAct(player)).is.false;
  });

  it('spends 1 energy to add 1 ore to this card', () => {
    player.energy = 1;
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(player.energy).to.eq(0);
    expect(card.resourceCount).to.eq(1);
  });

  it('spends 1 ore from this card to gain 2 M€', () => {
    player.addResourceTo(card, 1);
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(player.megaCredits).to.eq(2);
  });

  it('offers both options when both are available', () => {
    player.energy = 1;
    player.addResourceTo(card, 1);

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    expect(orOptions.options).has.lengthOf(2);
  });
});
