import {expect} from 'chai';
import {PlanetaryMuseum} from '../../../src/server/cards/robantilles/PlanetaryMuseum';
import {AdvancedAlloys} from '../../../src/server/cards/base/AdvancedAlloys';
import {SpaceElevator} from '../../../src/server/cards/base/SpaceElevator';
import {MarsUniversity} from '../../../src/server/cards/base/MarsUniversity';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('PlanetaryMuseum', () => {
  let card: PlanetaryMuseum;
  let player: TestPlayer;

  beforeEach(() => {
    card = new PlanetaryMuseum();
    [, player] = testGame(1);
  });

  it('increases M€ production by 1 per distinct tag, including this Building tag', () => {
    player.playedCards.push(new AdvancedAlloys()); // Science tag
    player.playedCards.push(new SpaceElevator()); // Space + Building tags
    player.playedCards.push(new MarsUniversity()); // Science + Building tags

    cast(card.play(player), undefined);

    // Distinct tags: Science, Space, Building (this card's own) = 3.
    expect(player.production.megacredits).eq(3);
  });

  it('counts only this card\'s own tag with an empty tableau', () => {
    cast(card.play(player), undefined);
    expect(player.production.megacredits).eq(1);
  });
});
