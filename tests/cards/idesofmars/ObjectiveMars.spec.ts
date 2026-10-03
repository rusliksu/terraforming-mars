import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {ObjectiveMars} from '../../../src/server/cards/idesofmars/ObjectiveMars';
import {Resource} from '../../../src/common/Resource';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';

describe('ObjectiveMars', () => {
  let card: ObjectiveMars;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ObjectiveMars();
    [game, player] = testGame(2);
  });

  it('cannot act when M€ production is already at its minimum', () => {
    player.production.add(Resource.MEGACREDITS, -5 - player.production.megacredits);
    expect(card.canAct(player)).is.false;
  });

  it('decreases M€ production 5 steps to add a budget resource to this card', () => {
    expect(card.canAct(player)).is.true;
    const productionBefore = player.production.megacredits;

    card.action(player);
    runAllActions(game);

    expect(player.production.megacredits).to.eq(productionBefore - 5);
    expect(card.resourceCount).to.eq(1);
  });

  it('awards 1 VP per budget resource on this card', () => {
    player.addResourceTo(card, 4);
    expect(card.getVictoryPoints(player)).to.eq(4);
  });
});
