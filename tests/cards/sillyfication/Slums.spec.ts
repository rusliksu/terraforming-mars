import {expect} from 'chai';
import {Slums} from '../../../src/server/cards/sillyfication/Slums';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {churn, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('Slums', () => {
  let card: Slums;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Slums();
    [game, player, player2] = testGame(2);
  });

  it('requires 4 cities in play, from any player', () => {
    player.megaCredits = card.cost;
    player.production.override({energy: 1});
    for (let i = 0; i < 3; i++) {
      game.addCity(player2, game.board.getAvailableSpacesForCity(player2)[0]);
    }
    expect(card.canPlay(player)).is.false;

    game.addCity(player2, game.board.getAvailableSpacesForCity(player2)[0]);
    expect(card.canPlay(player)).is.true;
  });

  it('places a city adjacent to another city, and decreases M€/energy production', () => {
    for (let i = 0; i < 4; i++) {
      game.addCity(player2, game.board.getAvailableSpacesForCity(player2)[0]);
    }
    player.production.override({megacredits: 0, energy: 1});

    const selectSpace = cast(churn(card.play(player), player), SelectSpace);
    const space = selectSpace.spaces[0];
    expect(game.board.getAdjacentSpaces(space).some((s) => s.tile !== undefined)).is.true;

    selectSpace.cb(space);
    runAllActions(game);

    expect(space.tile?.tileType).is.not.undefined;
    expect(player.production.megacredits).to.eq(-1);
    expect(player.production.energy).to.eq(0);
  });

  it('is worth -1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(-1);
  });
});
