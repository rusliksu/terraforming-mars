import {expect} from 'chai';
import {MonumentToMars} from '../../../src/server/cards/robantilles/MonumentToMars';
import {EarthOffice} from '../../../src/server/cards/base/EarthOffice';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('MonumentToMars', () => {
  let card: MonumentToMars;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MonumentToMars();
    [, player] = testGame(1);
  });

  it('increases M€ production 3 steps on play', () => {
    cast(card.play(player), undefined);
    expect(player.production.megacredits).eq(3);
  });

  it('scores 1 VP per 2 Earth tags, including this', () => {
    player.playedCards.push(card, new EarthOffice());
    expect(card.getVictoryPoints(player)).eq(1);
  });
});
