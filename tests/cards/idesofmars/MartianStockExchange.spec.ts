import {expect} from 'chai';
import {MartianStockExchange} from '../../../src/server/cards/idesofmars/MartianStockExchange';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {BigAsteroid} from '../../../src/server/cards/base/BigAsteroid';
import {Ants} from '../../../src/server/cards/base/Ants';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {cast} from '../../../src/common/utils/utils';

describe('MartianStockExchange', () => {
  let card: MartianStockExchange;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MartianStockExchange();
    [game, player] = testGame(2, {
      coloniesExtension: true,
      customColoniesList: [ColonyName.GANYMEDE, ColonyName.LUNA, ColonyName.PLUTO, ColonyName.CALLISTO, ColonyName.EUROPA],
    });
    player.tagsForTest = {earth: 1};
  });

  it('cannot play without an Earth tag', () => {
    player.tagsForTest = {earth: 0};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with an Earth tag', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('increases M€ production on play', () => {
    card.play(player);
    expect(player.production.megacredits).to.eq(3);
  });

  it('does nothing when a non-event card is played', () => {
    player.playedCards.push(card);
    expect(card.onCardPlayedByAnyPlayer(player, new Ants())).is.undefined;
    expect(player.getWaitingFor()).is.undefined;
  });

  it('offers to move a colony track when any event card is played', () => {
    player.playedCards.push(card);

    card.onCardPlayedByAnyPlayer(player, new BigAsteroid());
    runAllActions(game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    const increaseOption = orOptions.options.find((option) => option.title === 'Increase a colony tile track 1 step')!;
    increaseOption.cb(undefined);
    runAllActions(game);

    const selectColony = cast(player.popWaitingFor(), SelectColony);
    const before = selectColony.colonies[0].trackPosition;
    selectColony.cb(selectColony.colonies[0]);

    expect(selectColony.colonies[0].trackPosition).to.eq(before + 1);
  });
});
