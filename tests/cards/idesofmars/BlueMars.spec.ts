import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {BlueMars} from '../../../src/server/cards/idesofmars/BlueMars';
import {IceCapMelting} from '../../../src/server/cards/base/IceCapMelting';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {maxOutOceans, runAllActions, setTemperature} from '../../TestingUtils';

describe('BlueMars', () => {
  let card: BlueMars;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new BlueMars();
    [game, player] = testGame(1);
    setTemperature(game, 2);
  });

  it('cannot play until all oceans have been placed', () => {
    maxOutOceans(player, 8);
    expect(card.canPlay(player)).is.false;
    maxOutOceans(player, 9);
    expect(card.canPlay(player)).is.true;
  });

  it('raises TR instead of placing an ocean once all oceans are placed', () => {
    maxOutOceans(player);
    player.playedCards.push(card);
    const startingTr = player.terraformRating;

    const iceCapMelting = new IceCapMelting();
    cast(iceCapMelting.play(player), undefined);
    runAllActions(game);

    // No ocean can be placed, and no space selection is asked for.
    expect(player.popWaitingFor()).is.undefined;
    expect(game.board.getOceanSpaces()).has.length(9);
    expect(player.terraformRating).eq(startingTr + 1);
  });

  it('does not affect ocean placement before all oceans are placed', () => {
    player.playedCards.push(card);
    const oceansBefore = game.board.getOceanSpaces().length;

    const iceCapMelting = new IceCapMelting();
    cast(iceCapMelting.play(player), undefined);
    runAllActions(game);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    runAllActions(game);

    expect(game.board.getOceanSpaces()).has.length(oceansBefore + 1);
  });
});
