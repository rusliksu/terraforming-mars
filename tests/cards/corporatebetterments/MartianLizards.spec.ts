import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {runAllActions, setTemperature} from '../../TestingUtils';
import {MartianLizards} from '../../../src/server/cards/corporatebetterments/MartianLizards';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('MartianLizards', () => {
  let card: MartianLizards;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MartianLizards();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('cannot play with temperature below -2°C', () => {
    setTemperature(game, -4);
    expect(card.canPlay(player)).is.false;
  });

  it('can play with temperature at -2°C or above', () => {
    setTemperature(game, -2);
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without any heat', () => {
    player.heat = 0;
    expect(card.canAct(player)).is.false;
  });

  it('spends 1 heat to add 1 animal to this card', () => {
    player.heat = 1;
    expect(card.canAct(player)).is.true;

    card.action(player);
    const orOptions = cast(game.deferredActions.pop()!.execute(), OrOptions);
    orOptions.options[0].cb(undefined);
    runAllActions(game);

    expect(player.heat).to.eq(0);
    expect(card.resourceCount).to.eq(1);
  });

  it('spends 6 heat to add 2 animals to this card', () => {
    player.heat = 6;

    card.action(player);
    const orOptions = cast(game.deferredActions.pop()!.execute(), OrOptions);
    orOptions.options[1].cb(undefined);
    runAllActions(game);

    expect(player.heat).to.eq(0);
    expect(card.resourceCount).to.eq(2);
  });

  it('awards 1 VP for every 2 animals here', () => {
    player.addResourceTo(card, 5);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
