import {expect} from 'chai';
import {FullAccessCooperation} from '../../../src/server/cards/conglomerates/FullAccessCooperation';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';

describe('FullAccessCooperation', () => {
  let card: FullAccessCooperation;
  let player: TestPlayer;

  beforeEach(() => {
    card = new FullAccessCooperation();
    [, player] = testGame(4, {conglomeratesExpansion: true});
    player.megaCredits = 11;
  });

  it('can be played for 11 MC with no requirements', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('cannot be played without enough MC', () => {
    player.megaCredits = 10;
    expect(player.canPlay(card)).is.false;
  });
});
