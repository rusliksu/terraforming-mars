import {expect} from 'chai';
import {AutoFactory} from '../../../src/server/cards/highOrbit/AutoFactory';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {churn, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('AutoFactory', () => {
  let card: AutoFactory;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new AutoFactory();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('adds 1 ore to this card when it is empty', () => {
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(card.resourceCount).to.eq(1);
  });

  it('offers a choice once ore is stored here', () => {
    player.addResourceTo(card, 1);

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    expect(orOptions.options).has.lengthOf(3);

    // 'Spend 1 ore from this card to gain 1 titanium'
    orOptions.options[1].cb(undefined);
    expect(card.resourceCount).to.eq(0);
    expect(player.titanium).to.eq(1);
  });

  it('converts ore to 2 steel', () => {
    player.addResourceTo(card, 1);

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    // 'Spend 1 ore from this card to gain 2 steel'
    orOptions.options[2].cb(undefined);
    expect(card.resourceCount).to.eq(0);
    expect(player.steel).to.eq(2);
  });
});
