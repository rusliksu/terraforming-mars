import {expect} from 'chai';
import {Freighter} from '../../../src/server/cards/highOrbit/Freighter';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('Freighter', () => {
  let card: Freighter;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Freighter();
    [game, player] = testGame(2, {
      coloniesExtension: true,
      customColoniesList: [ColonyName.GANYMEDE, ColonyName.LUNA, ColonyName.PLUTO, ColonyName.CALLISTO, ColonyName.EUROPA],
    });
    player.playedCards.push(card);
  });

  it('cannot act when there are no colonies in the game', () => {
    const [, playerNoColonies] = testGame(2);
    expect(new Freighter().canAct(playerNoColonies)).is.false;
  });

  it('can lower a colony tile track, adding ore to this card since it has none', () => {
    expect(card.canAct(player)).is.true;

    const orOptions = cast(card.action(player), OrOptions);
    const lowerOption = orOptions.options.find((option) => option.title === 'Lower a colony tile track 1 step')!;
    lowerOption.cb(undefined);

    const selectColony = cast(game.deferredActions.pop()!.execute(), SelectColony);
    selectColony.cb(selectColony.colonies[0]);

    expect(selectColony.colonies[0].trackPosition).to.eq(0);
    expect(card.resourceCount).to.eq(1);
  });

  it('does not add ore again when this card already has ore', () => {
    player.addResourceTo(card, 1);

    const orOptions = cast(card.action(player), OrOptions);
    const lowerOption = orOptions.options.find((option) => option.title === 'Lower a colony tile track 1 step')!;
    lowerOption.cb(undefined);

    const selectColony = cast(game.deferredActions.pop()!.execute(), SelectColony);
    selectColony.cb(selectColony.colonies[0]);

    expect(card.resourceCount).to.eq(1);
  });

  it('can remove 1 ore from this card to raise a colony tile track 1 step', () => {
    player.addResourceTo(card, 1);

    const orOptions = cast(card.action(player), OrOptions);
    const raiseOption = orOptions.options.find((option) => option.title === 'Remove 1 ore from this card to raise a colony tile track 1 step')!;
    raiseOption.cb(undefined);

    const selectColony = cast(game.deferredActions.pop()!.execute(), SelectColony);
    selectColony.cb(game.colonies[0]);

    expect(game.colonies[0].trackPosition).to.eq(2);
    expect(card.resourceCount).to.eq(0);
  });
});
