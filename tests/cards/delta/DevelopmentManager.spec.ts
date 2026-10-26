import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {DevelopmentManager} from '../../../src/server/cards/delta/DevelopmentManager';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {DeltaProjectExpansion, DELTA_TRACK_TAGS} from '../../../src/server/delta/DeltaProjectExpansion';
import {Tag} from '../../../src/common/cards/Tag';
import {Resource} from '../../../src/common/Resource';
import {fakeCard} from '../../TestingUtils';

describe('DevelopmentManager', () => {
  let card: DevelopmentManager;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new DevelopmentManager();
    [/* game */, player, player2] = testGame(2, {deltaProjectExpansion: true});
    player.playedCards.push(card);
  });

  it('gains 2 M€ when a production increases by 2 or more steps', () => {
    player.megaCredits = 0;
    player.production.add(Resource.STEEL, 2, {log: true});
    expect(player.megaCredits).eq(2);
  });

  it('does not gain M€ for a 1-step production increase', () => {
    player.megaCredits = 0;
    player.production.add(Resource.STEEL, 1, {log: true});
    expect(player.megaCredits).eq(0);
  });

  it('gains 2 M€ when advancing 2 or more Delta Project steps', () => {
    player.playedCards.push(fakeCard({tags: DELTA_TRACK_TAGS.filter((t): t is Tag => t !== undefined)}));
    player.energy = 2;
    player.megaCredits = 0;

    DeltaProjectExpansion.advance(player, 2);

    expect(player.megaCredits).eq(2);
  });

  it('does not gain M€ for a 1-step Delta Project advance', () => {
    player.playedCards.push(fakeCard({tags: [Tag.BUILDING]}));
    player.energy = 1;
    player.megaCredits = 0;

    DeltaProjectExpansion.advance(player, 1);

    expect(player.megaCredits).eq(0);
  });

  it('does not gain M€ for another player\'s Delta Project advance', () => {
    player2.playedCards.push(fakeCard({tags: DELTA_TRACK_TAGS.filter((t): t is Tag => t !== undefined)}));
    player2.energy = 2;
    player.megaCredits = 0;

    DeltaProjectExpansion.advance(player2, 2);

    expect(player.megaCredits).eq(0);
  });

  it('is a blue (Active) card', () => {
    expect(card.type).eq(CardType.ACTIVE);
  });
});
