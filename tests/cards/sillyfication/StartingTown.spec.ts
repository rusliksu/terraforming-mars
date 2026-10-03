import {expect} from 'chai';
import {StartingTown} from '../../../src/server/cards/sillyfication/StartingTown';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {churn, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('StartingTown', () => {
  let card: StartingTown;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new StartingTown();
    [game, player] = testGame(2);
    player.production.override({energy: 1});
  });

  it('requires that you have no city tiles', () => {
    expect(card.canPlay(player)).is.true;
    game.addCity(player, game.board.getAvailableSpacesForCity(player)[0]);
    expect(card.canPlay(player)).is.false;
  });

  it('places a city, and adjusts M€/energy production', () => {
    player.production.override({megacredits: 0, energy: 1});

    const selectSpace = cast(churn(card.play(player), player), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    runAllActions(game);

    expect(selectSpace.spaces[0].tile?.tileType).is.not.undefined;
    expect(player.production.megacredits).to.eq(3);
    expect(player.production.energy).to.eq(0);
  });

  it('scores 1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
