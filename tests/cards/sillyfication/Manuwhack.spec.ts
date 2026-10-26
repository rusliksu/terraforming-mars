import {expect} from 'chai';
import {Manuwhack} from '../../../src/server/cards/sillyfication/Manuwhack';
import {Resource} from '../../../src/common/Resource';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('Manuwhack', () => {
  let card: Manuwhack;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new Manuwhack();
    [/* game */, player, player2] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires 5 building tags', () => {
    player.tagsForTest = {building: 4};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {building: 5};
    expect(card.canPlay(player)).is.true;
  });

  it('gains every player 1 of a resource whenever anyone gains that production, capped at 1', () => {
    player.steel = 0;
    player2.steel = 0;

    player2.production.add(Resource.STEEL, 3, {log: true});

    expect(player.steel).to.eq(1);
    expect(player2.steel).to.eq(1);
  });

  it('does not react to production losses', () => {
    player2.production.override({steel: 2});
    player.steel = 0;
    player2.production.add(Resource.STEEL, -1, {log: true});
    expect(player.steel).to.eq(0);
  });
});
