import {expect} from 'chai';
import {IndustrialSpy} from '../../../src/server/cards/idesofmars/IndustrialSpy';
import {SearchForLife} from '../../../src/server/cards/base/SearchForLife';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('IndustrialSpy', () => {
  let card: IndustrialSpy;
  let player: TestPlayer;
  let opponent: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new IndustrialSpy();
    [game, player, opponent] = testGame(2);
  });

  it('cannot play without an opponent', () => {
    const [/* game */, solo] = testGame(1);
    expect(card.canPlay(solo)).is.false;
  });

  it('can play with an opponent', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('reveals the selected opponent\'s hand privately to the acting player', () => {
    const someCard = new SearchForLife();
    opponent.cardsInHand = [someCard];

    const selectPlayer = cast(card.play(player), SelectPlayer);
    expect(selectPlayer.players).to.deep.eq([opponent]);
    selectPlayer.cb(opponent);

    // Nothing about the opponent's hand actually changes - this is a look, not a theft.
    expect(opponent.cardsInHand).to.deep.eq([someCard]);

    const lastLog = game.gameLog[game.gameLog.length - 1];
    expect(lastLog.playerId).to.eq(player.id);
  });
});
