import {expect} from 'chai';
import {NeptuneExpedition} from '../../../src/server/cards/robantilles/NeptuneExpedition';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('NeptuneExpedition', () => {
  let card: NeptuneExpedition;
  let player: TestPlayer;

  beforeEach(() => {
    card = new NeptuneExpedition();
    [, player] = testGame(2);
  });

  it('draws 1 card per Jovian tag, including this', () => {
    player.tagsForTest = {jovian: 2};

    cast(card.play(player), undefined);

    expect(player.cardsInHand).has.length(3);
  });

  it('scores a flat 2 VP', () => {
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
