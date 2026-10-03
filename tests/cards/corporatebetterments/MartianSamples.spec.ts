import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {MartianSamples} from '../../../src/server/cards/corporatebetterments/MartianSamples';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {addCity, runAllActions, setOxygenLevel} from '../../TestingUtils';

describe('MartianSamples', () => {
  let card: MartianSamples;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MartianSamples();
    [game, player] = testGame(1);
  });

  it('cannot play with oxygen above 4%', () => {
    setOxygenLevel(game, 5);
    expect(card.canPlay(player)).is.false;
  });

  it('can play with oxygen at or below 4%', () => {
    setOxygenLevel(game, 4);
    expect(card.canPlay(player)).is.true;
  });

  it('claims 3 spaces, one at a time', () => {
    const first = cast(card.play(player), SelectSpace);
    const space1 = first.spaces[0];
    const second = cast(first.cb(space1), SelectSpace);
    expect(space1.player).eq(player);

    const space2 = second.spaces[0];
    const third = cast(second.cb(space2), SelectSpace);
    expect(space2.player).eq(player);

    const space3 = third.spaces[0];
    const result = third.cb(space3);
    expect(space3.player).eq(player);
    expect(result).is.undefined;

    expect(card.data).has.members([space1.id, space2.id, space3.id]);
  });

  it('gains 2 M€ only when placing a tile on a claimed space, and only once', () => {
    // onTilePlaced is dispatched to cards in the player's tableau.
    player.playedCards.push(card);

    const first = cast(card.play(player), SelectSpace);
    const space1 = first.spaces[0];
    const second = cast(first.cb(space1), SelectSpace);
    const space2 = second.spaces[0];
    const third = cast(second.cb(space2), SelectSpace);
    const space3 = third.spaces[0];
    third.cb(space3);

    const otherSpace = player.game.board.getAvailableSpacesForCity(player)
      .find((space) => ![space1.id, space2.id, space3.id].includes(space.id));
    if (otherSpace === undefined) {
      throw new Error('Expected an available space that was not claimed by Martian Samples');
    }

    addCity(player, otherSpace.id);
    runAllActions(game);
    expect(player.megaCredits).eq(0);

    addCity(player, space1.id);
    runAllActions(game);
    expect(player.megaCredits).eq(2);
    expect(card.data).does.not.include(space1.id);
    expect(card.data).has.length(2);
  });
});
