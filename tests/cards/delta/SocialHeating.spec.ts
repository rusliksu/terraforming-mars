import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {SocialHeating} from '../../../src/server/cards/delta/SocialHeating';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addCity} from '../../TestingUtils';
import {DeltaProjectExpansion} from '../../../src/server/delta/DeltaProjectExpansion';

describe('SocialHeating', () => {
  let card: SocialHeating;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new SocialHeating();
    [/* game */, player, player2] = testGame(2, {deltaProjectExpansion: true});
  });

  it('requires a city in play', () => {
    expect(card.canPlay(player)).is.false;
    addCity(player);
    expect(card.canPlay(player)).is.true;
  });

  it('gains heat equal to steps taken when the owner moves', () => {
    player.playedCards.push(card);
    player.tagsForTest = {building: 1};
    player.energy = 1;
    player.heat = 0;

    DeltaProjectExpansion.advance(player, 1);

    expect(player.heat).eq(1);
  });

  it('gains heat when another player moves too', () => {
    player.playedCards.push(card);
    player2.tagsForTest = {building: 1, power: 1};
    player2.energy = 2;
    player.heat = 0;

    DeltaProjectExpansion.advance(player2, 2);

    expect(player.heat).eq(2);
  });

  it('is a blue (Active) card', () => {
    expect(card.type).eq(CardType.ACTIVE);
  });
});
