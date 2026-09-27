import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {MarketManipulationCb} from '../../../src/server/cards/corporatebetterments/MarketManipulationCb';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('MarketManipulationCb', () => {
  let card: MarketManipulationCb;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MarketManipulationCb();
    [game, player] = testGame(2, {
      coloniesExtension: true,
      customColoniesList: [ColonyName.GANYMEDE, ColonyName.LUNA, ColonyName.PLUTO, ColonyName.CALLISTO, ColonyName.EUROPA],
    });
    player.playedCards.push(card);
  });

  it('increases M€ production on play', () => {
    card.play(player);
    expect(player.production.megacredits).to.eq(2);
  });

  it('cannot act when there are no colonies in the game', () => {
    const [, playerNoColonies] = testGame(2);
    expect(new MarketManipulationCb().canAct(playerNoColonies)).is.false;
  });

  it('can increase a colony tile track', () => {
    expect(card.canAct(player)).is.true;

    const orOptions = cast(card.action(player), OrOptions);
    const increaseOption = orOptions.options.find((option) => option.title === 'Increase a colony tile track 1 step')!;
    increaseOption.cb(undefined);

    const selectColony = cast(game.deferredActions.pop()!.execute(), SelectColony);
    selectColony.cb(selectColony.colonies[0]);

    expect(selectColony.colonies[0].trackPosition).to.eq(2);
  });

  it('can decrease a colony tile track', () => {
    game.colonies[0].trackPosition = 3;

    const orOptions = cast(card.action(player), OrOptions);
    const decreaseOption = orOptions.options.find((option) => option.title === 'Decrease a colony tile track 1 step')!;
    decreaseOption.cb(undefined);

    const selectColony = cast(game.deferredActions.pop()!.execute(), SelectColony);
    selectColony.cb(game.colonies[0]);

    expect(game.colonies[0].trackPosition).to.eq(2);
  });
});
