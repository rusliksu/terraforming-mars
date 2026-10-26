import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {IoThermalization} from '../../../src/server/cards/corporatebetterments/IoThermalization';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('IoThermalization', () => {
  let card: IoThermalization;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new IoThermalization();
    [game, player] = testGame(2);
  });

  it('cannot act with no titanium and no heat production', () => {
    player.titanium = 0;
    player.production.override({heat: 0});
    expect(card.canAct(player)).is.false;
  });

  it('spends 1 titanium to increase heat production 1 step', () => {
    player.titanium = 1;
    expect(card.canAct(player)).is.true;

    card.action(player);
    const orOptions = cast(game.deferredActions.pop()!.execute(), OrOptions);
    const spendOption = orOptions.options.find((option) => option.title === 'Spend 1 titanium to increase your heat production 1 step')!;
    spendOption.cb(undefined);

    expect(player.titanium).to.eq(0);
    expect(player.production.heat).to.eq(1);
  });

  it('decreases heat production 2 steps to raise TR 1 step', () => {
    player.production.override({heat: 2});
    const startingTr = player.terraformRating;

    card.action(player);
    const orOptions = cast(game.deferredActions.pop()!.execute(), OrOptions);
    const trOption = orOptions.options.find((option) => option.title === 'Decrease your heat production 2 steps to raise your TR 1 step')!;
    trOption.cb(undefined);

    expect(player.production.heat).to.eq(0);
    expect(player.terraformRating).to.eq(startingTr + 1);
  });

  it('awards 2 flat VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
