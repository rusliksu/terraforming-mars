import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {WaterCleaningBacteria} from '../../../src/server/cards/idesofmars/WaterCleaningBacteria';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addOcean, runAllActions, setTemperature} from '../../TestingUtils';

describe('WaterCleaningBacteria', () => {
  let card: WaterCleaningBacteria;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new WaterCleaningBacteria();
    [game, player, player2] = testGame(2);
  });

  it('cannot play when colder than -18C', () => {
    setTemperature(game, -20);
    expect(card.canPlay(player)).is.false;
    setTemperature(game, -18);
    expect(card.canPlay(player)).is.true;
  });

  it('increases energy production 1 step on play', () => {
    card.play(player);
    expect(player.production.energy).eq(1);
  });

  it('gains 3 microbes whenever any ocean is placed', () => {
    player.playedCards.push(card);
    addOcean(player2);
    expect(card.resourceCount).eq(3);
    addOcean(player);
    expect(card.resourceCount).eq(6);
  });

  it('cannot act without 8 microbes', () => {
    player.playedCards.push(card);
    player.addResourceTo(card, 7);
    expect(card.canAct(player)).is.false;
    player.addResourceTo(card, 1);
    expect(card.canAct(player)).is.true;
  });

  it('spends 8 microbes to place an ocean', () => {
    player.playedCards.push(card);
    player.addResourceTo(card, 8);

    cast(card.action(player), undefined);
    expect(card.resourceCount).eq(0);

    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);

    expect(game.board.getOceanSpaces()).has.length(1);
  });
});
