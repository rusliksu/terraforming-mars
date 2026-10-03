import {expect} from 'chai';
import {NativeMicrofauna} from '../../../src/server/cards/venusPhase2/NativeMicrofauna';
import {Ants} from '../../../src/server/cards/base/Ants';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {setVenusScaleLevel, runAllActions} from '../../TestingUtils';

describe('NativeMicrofauna', () => {
  let card: NativeMicrofauna;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new NativeMicrofauna();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('requires Venus 16% or less', () => {
    setVenusScaleLevel(game, 17);
    expect(card.canPlay(player)).is.false;
    setVenusScaleLevel(game, 16);
    expect(card.canPlay(player)).is.true;
  });

  it('adds 2 microbes to any card', () => {
    const ants = new Ants();
    player.playedCards.push(ants);
    card.play(player);
    runAllActions(game);
    expect(ants.resourceCount).to.eq(2);
  });
});
