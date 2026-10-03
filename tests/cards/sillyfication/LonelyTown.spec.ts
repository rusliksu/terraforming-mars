import {expect} from 'chai';
import {LonelyTown} from '../../../src/server/cards/sillyfication/LonelyTown';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {churn, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('LonelyTown', () => {
  let card: LonelyTown;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new LonelyTown();
    [game, player] = testGame(2);
    player.production.override({energy: 1});
  });

  it('offers only spaces with 2 clear hexes in every direction', () => {
    const chosenSpace = game.board.getAvailableSpacesOnLand(player)[0];
    // Place an unrelated city 2 hexes away from chosenSpace, which should disqualify it.
    const ring1 = game.board.getAdjacentSpaces(chosenSpace);
    const twoAway = game.board.getAdjacentSpaces(ring1[0]).find((s) => s !== chosenSpace && !ring1.includes(s));
    if (twoAway !== undefined) {
      game.addCity(player, twoAway);
    }

    const selectSpace = cast(churn(card.play(player), player), SelectSpace);
    expect(selectSpace.spaces).to.not.include(chosenSpace);

    for (const space of selectSpace.spaces) {
      for (const r1 of game.board.getAdjacentSpaces(space)) {
        expect(r1.tile).is.undefined;
        for (const r2 of game.board.getAdjacentSpaces(r1)) {
          if (r2 !== space) {
            expect(r2.tile).is.undefined;
          }
        }
      }
    }
  });

  it('places a city and adjusts M€/energy production', () => {
    player.production.override({megacredits: 0, energy: 1});

    const selectSpace = cast(churn(card.play(player), player), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    runAllActions(game);

    expect(selectSpace.spaces[0].tile?.tileType).is.not.undefined;
    expect(player.production.megacredits).to.eq(3);
    expect(player.production.energy).to.eq(0);
  });
});
