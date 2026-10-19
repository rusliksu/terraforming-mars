import {expect} from 'chai';
import {MuskAwards} from '../../../src/server/cards/robantilles/MuskAwards';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('MuskAwards', () => {
  let card: MuskAwards;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MuskAwards();
    [, player] = testGame(1);
  });

  it('increases M€ production 1 step per Science tag on play', () => {
    player.tagsForTest = {science: 4};

    cast(card.play(player), undefined);

    expect(player.production.megacredits).eq(4);
  });

  it('scores 1 VP per 2 Science tags', () => {
    player.tagsForTest = {science: 5};
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
