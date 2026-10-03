import {expect} from 'chai';
import {IGame} from '../../../src/server/IGame';
import {runAllActions} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {NewFrontier} from '../../../src/server/cards/idesofmars/NewFrontier';
import {Titan} from '../../../src/server/colonies/Titan';
import {Callisto} from '../../../src/server/colonies/Callisto';
import {cast} from '../../../src/common/utils/utils';

describe('NewFrontier', () => {
  let card: NewFrontier;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new NewFrontier();
    [game, player] = testGame(1, {coloniesExtension: true});
  });

  it('requires the colonies extension', () => {
    const [soloGame, solo] = testGame(1);
    const soloCard = new NewFrontier();
    expect(soloGame.colonies.length).to.eq(0);
    expect(soloCard.canPlay(solo)).is.false;
  });

  it('requires that every colony tile in play has at least 1 colony', () => {
    expect(game.colonies.length).is.greaterThan(0);
    expect(card.canPlay(player)).is.false;

    game.colonies.forEach((colony) => colony.colonies.push(player.id));
    expect(card.canPlay(player)).is.true;
  });

  it('adds a colony tile from the discarded pile and places a colony on it', () => {
    // Use a 2-player game: a solo game additionally queues its own "remove a colony"
    // setup action, which would otherwise be the first thing popped below.
    const [twoPlayerGame, twoPlayer] = testGame(2, {coloniesExtension: true});
    twoPlayerGame.colonies.forEach((colony) => colony.colonies.push(twoPlayer.id));
    // Titan starts inactive (it needs its own activation condition); Callisto is active by
    // default, so picking it exercises the "place a colony immediately" half of the card.
    twoPlayerGame.discardedColonies = [new Titan(), new Callisto()];
    const coloniesInPlay = twoPlayerGame.colonies.length;

    card.play(twoPlayer);
    runAllActions(twoPlayerGame);

    const selectColony = cast(twoPlayer.popWaitingFor(), SelectColony);
    const selected = selectColony.colonies.find((colony) => colony instanceof Callisto)!;
    expect(selected).is.not.undefined;
    selectColony.cb(selected);

    expect(twoPlayerGame.colonies).to.contain(selected);
    expect(twoPlayerGame.colonies).has.length(coloniesInPlay + 1);
    expect(selected.colonies).to.contain(twoPlayer.id);
  });
});
