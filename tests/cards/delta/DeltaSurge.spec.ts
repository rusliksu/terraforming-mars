import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {DeltaSurge} from '../../../src/server/cards/delta/DeltaSurge';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {DeltaProjectExpansion, DELTA_TRACK_TAGS} from '../../../src/server/delta/DeltaProjectExpansion';
import {Tag} from '../../../src/common/cards/Tag';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';

describe('DeltaSurge', () => {
  let card: DeltaSurge;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new DeltaSurge();
    [game, player] = testGame(2, {deltaProjectExpansion: true});
  });

  it('places an ocean tile when played', () => {
    const oceansBefore = game.board.getOceanSpaces().length;
    cast(card.play(player), undefined);
    runAllActions(game);
    const action = cast(player.popWaitingFor(), SelectSpace);
    action.cb(action.spaces[0]);

    expect(game.board.getOceanSpaces().length).eq(oceansBefore + 1);
  });

  it('grants every step\'s reward when advancing multiple steps at once', () => {
    player.playedCards.push(card);
    player.playedCards.push(fakeCard({tags: DELTA_TRACK_TAGS.filter((t): t is Tag => t !== undefined)}));
    player.energy = 3;

    DeltaProjectExpansion.advance(player, 3);

    // Position 1 (Building) and 2 (Power) each queue a choice; position 3 (Earth) is
    // immediate M€ production. All three should have been triggered by this one jump.
    expect(player.production.megacredits).eq(2);
    expect(game.deferredActions).has.lengthOf(2);
  });

  it('is a blue (Active) card', () => {
    expect(card.type).eq(CardType.ACTIVE);
  });
});
