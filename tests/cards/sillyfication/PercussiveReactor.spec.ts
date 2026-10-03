import {expect} from 'chai';
import {PercussiveReactor} from '../../../src/server/cards/sillyfication/PercussiveReactor';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, setTemperature} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('PercussiveReactor', () => {
  let card: PercussiveReactor;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PercussiveReactor();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('spends 2 energy to gain 7 heat', () => {
    player.energy = 2;
    const options = cast(card.action(player), OrOptions);
    options.options[0].cb();

    expect(player.energy).to.eq(0);
    expect(player.heat).to.eq(7);
  });

  it('blowing up the reactor raises temperature 1 step and disables the card', () => {
    player.energy = 0;
    setTemperature(game, -18);

    // No energy, so only the "blow up" branch is available and auto-resolves.
    expect(card.action(player)).is.undefined;
    runAllActions(game);

    expect(game.getTemperature()).to.eq(-16);
    expect(card.isDisabled).is.true;
    expect(card.canAct()).is.false;
  });
});
