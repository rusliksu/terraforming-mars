import {expect} from 'chai';
import {FungalFrenzy} from '../../../src/server/cards/sillyfication/FungalFrenzy';
import {Ants} from '../../../src/server/cards/base/Ants';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions, setTemperature} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('FungalFrenzy', () => {
  let card: FungalFrenzy;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new FungalFrenzy();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires -8°C or colder', () => {
    setTemperature(game, -6);
    expect(card.canPlay(player)).is.false;
    setTemperature(game, -8);
    expect(card.canPlay(player)).is.true;
  });

  it('play adds 1 microbe per microbe tag, including this', () => {
    // Only this card's own microbe tag.
    cast(card.play(player), undefined);
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);
  });

  it('play counts other microbe tags', () => {
    player.playedCards.push(new Ants()); // has a microbe tag
    cast(card.play(player), undefined);
    runAllActions(game);
    // this card + Ants = 2 microbe tags.
    expect(card.resourceCount).to.eq(2);
  });

  it('action adds a microbe when none are stored', () => {
    expect(card.action(player)).is.undefined;
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);
  });

  it('action can spend 2 microbes for 2 plant production', () => {
    player.addResourceTo(card, 3);

    expect(card.action(player)).is.undefined;
    runAllActions(game);
    const orOptions = cast(player.popWaitingFor(), OrOptions);

    orOptions.options[0].cb();
    runAllActions(game);

    expect(card.resourceCount).to.eq(1);
    expect(player.production.plants).to.eq(2);
  });
});
