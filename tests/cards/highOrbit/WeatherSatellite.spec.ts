import {expect} from 'chai';
import {WeatherSatellite} from '../../../src/server/cards/highOrbit/WeatherSatellite';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('WeatherSatellite', () => {
  let card: WeatherSatellite;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new WeatherSatellite();
    [/* game */, player, player2] = testGame(2);
  });

  it('cannot play without more Space tags than Infrastructure tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {[Tag.SPACE]: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('gains 1 M€ per TR step raised, self', () => {
    player.playedCards.push(card);
    player.megaCredits = 0;

    player.increaseTerraformRating(1);
    expect(player.megaCredits).to.eq(1);

    player.increaseTerraformRating(3);
    expect(player.megaCredits).to.eq(4);
  });

  it('does not gain M€ from an opponent raising TR', () => {
    player.playedCards.push(card);
    player.megaCredits = 0;
    player2.megaCredits = 0;

    player2.increaseTerraformRating(2);

    expect(player.megaCredits).to.eq(0);
    expect(player2.megaCredits).to.eq(0);
  });
});
