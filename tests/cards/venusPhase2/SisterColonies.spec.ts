import {expect} from 'chai';
import {SisterColonies} from '../../../src/server/cards/venusPhase2/SisterColonies';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {cast} from '../../../src/common/utils/utils';

describe('SisterColonies', () => {
  let card: SisterColonies;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SisterColonies();
    [game, player] = testGame(2, {coloniesExtension: true});
  });

  it('cannot play with fewer than 2 playable colonies', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('places 2 colonies on 2 different colony tiles', () => {
    card.play(player);
    runAllActions(game);

    const first = cast(player.popWaitingFor(), SelectColony);
    const firstColony = first.colonies[0];
    first.cb(firstColony);
    runAllActions(game);

    const second = cast(player.popWaitingFor(), SelectColony);
    expect(second.colonies).to.not.include(firstColony);
    const secondColony = second.colonies[0];
    second.cb(secondColony);

    expect(firstColony.colonies).to.include(player.id);
    expect(secondColony.colonies).to.include(player.id);
  });
});
