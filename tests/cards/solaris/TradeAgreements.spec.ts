import {expect} from 'chai';
import {TradeAgreements} from '../../../src/server/cards/solaris/TradeAgreements';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty, runAllActions} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Luna} from '../../../src/server/colonies/Luna';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {cast} from '../../../src/common/utils/utils';

describe('TradeAgreements', () => {
  let card: TradeAgreements;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    card = new TradeAgreements();
    restoreShuffle = forcePartiesInPlay(PartyName.UNITY);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true, coloniesExtension: true});
    game.colonies = [new Luna()];
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('Cannot play without Unity', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('Can play when Unity rules', () => {
    setRulingParty(game, PartyName.UNITY);
    expect(card.canPlay(player)).is.true;
  });

  it('canAct requires 2 steel or 2 plants and a tradeable colony', () => {
    player.steel = 0;
    player.plants = 0;
    expect(card.canAct(player)).is.false;

    player.steel = 2;
    expect(card.canAct(player)).is.true;
  });

  it('action offers a choice when both steel and plants are affordable', () => {
    player.steel = 2;
    player.plants = 2;
    const orOptions = cast(card.action(player), OrOptions);
    expect(orOptions.options).has.length(2);

    orOptions.options[0].cb();
    runAllActions(game);
    const selectColony = cast(game.deferredActions.peek()!.execute(), SelectColony);
    selectColony.cb(selectColony.colonies[0]);

    expect(player.steel).to.eq(0);
    expect(player.plants).to.eq(2);
  });

  it('action pays with plants directly when steel is unaffordable', () => {
    player.steel = 0;
    player.plants = 2;
    card.action(player);
    runAllActions(game);
    const selectColony = cast(game.deferredActions.peek()!.execute(), SelectColony);
    selectColony.cb(selectColony.colonies[0]);

    expect(player.plants).to.eq(0);
  });

  it('scores 1 VP per colony owned', () => {
    expect(card.getVictoryPoints(player)).to.eq(0);
    game.colonies[0].colonies.push(player.id);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
