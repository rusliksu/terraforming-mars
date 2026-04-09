import {expect} from 'chai';
import {ChooseCards} from '../../src/server/deferredActions/ChooseCards';
import {keep, LogType} from '../../src/server/deferredActions/ChooseCards';
import {MicroMills} from '../../src/server/cards/base/MicroMills';
import {MiningArea} from '../../src/server/cards/base/MiningArea';
import {Research} from '../../src/server/cards/base/Research';
import {Game} from '../../src/server/Game';
import {SelectCard} from '../../src/server/inputs/SelectCard';
import {LogMessageDataType} from '../../src/common/logs/LogMessageDataType';
import {TestPlayer} from '../TestPlayer';
import {cast} from '../TestingUtils';

describe('ChooseCards', () => {
  it('preserves keepMax when zero cards may be kept', () => {
    const player = TestPlayer.BLUE.newPlayer();

    const input = cast(new ChooseCards(player, [
      new MicroMills(),
      new MiningArea(),
    ], {keepMax: 0}).execute(), SelectCard);
    const model = input.toModel(player);

    expect(model.max).eq(0);
    expect(model.min).eq(0);
    expect(model.buttonLabel).eq('Ok');
  });

  it('shows zero affordable cards as max 0 with Ok button', () => {
    const player = TestPlayer.BLUE.newPlayer();
    player.megaCredits = 0;
    player.cardCost = 3;

    const input = cast(new ChooseCards(player, [
      new MicroMills(),
      new MiningArea(),
    ], {paying: true}).execute(), SelectCard);
    const model = input.toModel(player);

    expect(model.max).eq(0);
    expect(model.min).eq(0);
    expect(model.buttonLabel).eq('Ok');
    expect(model.title).eq('You cannot afford any cards');
  });

  it('caps max cards to what player can afford', () => {
    const player = TestPlayer.BLUE.newPlayer();
    player.megaCredits = 3;
    player.cardCost = 3;

    const input = cast(new ChooseCards(player, [
      new MicroMills(),
      new MiningArea(),
      new Research(),
    ], {paying: true}).execute(), SelectCard);
    const model = input.toModel(player);

    expect(model.max).eq(1);
    expect(model.min).eq(0);
    expect(model.buttonLabel).eq('Buy');
  });

  it('uses the action verb in private detailed logs after keeping cards', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const opponent = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, opponent], player);
    const keptCards = [new MicroMills(), new MiningArea()];

    keep(player, keptCards, [new Research()], LogType.BOUGHT);
    const logEntries = game.gameLog.slice(-2);

    expect(logEntries).has.length(2);
    expect(logEntries[0].message).eq('${0} ${1} ${2} card(s)');
    expect(logEntries[1].message).eq('You bought ${0} skipping ${1}');
    expect(logEntries[1].data[0].type).eq(LogMessageDataType.CARDS);
    expect(logEntries[1].data[0].value).to.deep.eq(keptCards.map((card) => card.name));
    expect(logEntries[1].data[1].type).eq(LogMessageDataType.CARDS);
    expect(logEntries[1].data[1].value).to.deep.eq([new Research().name]);
  });
});
