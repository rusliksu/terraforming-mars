import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {UniversalFighters} from '../../../src/server/cards/idesofmars/UniversalFighters';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('UniversalFighters', () => {
  let card: UniversalFighters;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new UniversalFighters();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('adds 2 fighters to this card on play', () => {
    card.play(player);
    runAllActions(game);
    expect(card.resourceCount).to.eq(2);
  });

  it('awards 1 VP for every 2 fighters on this card', () => {
    player.addResourceTo(card, 4);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });

  it('cannot act when there are no floaters or fighters anywhere', () => {
    expect(card.canAct(player)).is.false;
  });

  it('can act once there is a fighter somewhere (on this card)', () => {
    card.play(player);
    runAllActions(game);
    expect(card.canAct(player)).is.true;
  });

  it('removes a fighter from this card, then loses the floater with nowhere to put it', () => {
    card.play(player);
    runAllActions(game);

    card.action(player);
    runAllActions(game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    orOptions.options[0].cb(undefined); // Add 1 floater to any card
    runAllActions(game);

    expect(card.resourceCount).to.eq(1);
  });

  it('removes a fighter from this card and can add it right back', () => {
    card.play(player);
    runAllActions(game);

    card.action(player);
    runAllActions(game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    orOptions.options[1].cb(undefined); // Add 1 fighter to any card
    runAllActions(game);

    expect(card.resourceCount).to.eq(2);
  });
});
