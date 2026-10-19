import {expect} from 'chai';
import {BattleOfZadonga} from '../../../src/server/cards/robantilles/BattleOfZadonga';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {addCity} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';

describe('BattleOfZadonga', () => {
  let card: BattleOfZadonga;
  let player: TestPlayer;
  let opponent: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new BattleOfZadonga();
    [game, player, opponent] = testGame(2);
  });

  it('cannot play without an opponent city', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('co-owns an opponent city once played', () => {
    const city = addCity(opponent);
    expect(card.canPlay(player)).is.true;

    const selectSpace = cast(card.play(player), SelectSpace);
    selectSpace.cb(city);

    expect(city.coOwner).to.eq(player);
    expect(game.board.getCities(player)).to.include(city);
    expect(game.board.getCities(opponent)).to.include(city);
  });
});
