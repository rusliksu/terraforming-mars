import {expect} from 'chai';
import {Flagship} from '../../../src/server/cards/solaris/Flagship';
import {Resource} from '../../../src/common/Resource';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('Flagship', () => {
  let card: Flagship;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Flagship();
    [game, player] = testGame(1);
  });

  it('cannot play without titanium production', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play with titanium production', () => {
    player.production.add(Resource.TITANIUM, 1);
    expect(card.canPlay(player)).is.true;
  });

  it('adds 1 fighter to this card on action', () => {
    expect(card.resourceCount).to.eq(0);
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);
  });

  it('scores 1 VP per fighter on this card', () => {
    card.resourceCount = 3;
    expect(card.getVictoryPoints(player)).eq(3);
  });
});
