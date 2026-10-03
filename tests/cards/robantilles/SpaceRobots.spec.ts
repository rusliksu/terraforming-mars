import {expect} from 'chai';
import {SpaceRobots} from '../../../src/server/cards/robantilles/SpaceRobots';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {SolarWindPower} from '../../../src/server/cards/base/SolarWindPower';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('SpaceRobots', () => {
  let card: SpaceRobots;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SpaceRobots();
    [/* game */, player] = testGame(2);
  });

  it('cannot play without a Space-tagged card with production in the tableau', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('copies 1 step of a Space-tagged card\'s production', () => {
    const solarWindPower = new SolarWindPower(); // Space tag, +1 energy production
    player.playedCards.push(solarWindPower);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;

    const selectCard = cast(card.play(player), SelectCard);
    expect(selectCard.cards).to.deep.eq([solarWindPower]);

    expect(player.production.energy).to.eq(0);
    selectCard.cb([solarWindPower]);
    expect(player.production.energy).to.eq(1);
  });
});
