import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {InVivoTesting} from '../../../src/server/cards/idesofmars/InVivoTesting';
import {Ants} from '../../../src/server/cards/base/Ants';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('InVivoTesting', () => {
  let card: InVivoTesting;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new InVivoTesting();
    [game, player, player2] = testGame(2);
  });

  it('cannot play without a Science tag', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {science: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('scores -1 VP', () => {
    expect(card.getVictoryPoints(player)).eq(-1);
  });

  it('offers only the plants option when no card holds enough microbes, and removes plants from the chosen opponent', () => {
    player.tagsForTest = {science: 1};
    player2.plants = 8;

    cast(card.play(player), undefined);

    const orOptions = cast(game.deferredActions.pop()!.execute(), OrOptions);
    expect(orOptions.options).has.lengthOf(1);

    orOptions.options[0].cb();
    runAllActions(game);

    const removalChoice = cast(player.popWaitingFor(), OrOptions);
    removalChoice.options[0].cb();
    runAllActions(game);

    expect(player2.plants).eq(3);
  });

  it('offers a choice between microbes and plants, and removes microbes from the only eligible card', () => {
    player.tagsForTest = {science: 1};
    const ants = new Ants();
    player2.playedCards.push(ants);
    player2.addResourceTo(ants, 5);
    player2.plants = 8;

    cast(card.play(player), undefined);

    const orOptions = cast(game.deferredActions.pop()!.execute(), OrOptions);
    expect(orOptions.options).has.lengthOf(2);

    orOptions.options[0].cb();
    runAllActions(game);

    expect(ants.resourceCount).eq(2);
  });
});
