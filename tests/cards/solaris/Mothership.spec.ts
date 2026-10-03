import {expect} from 'chai';
import {Mothership} from '../../../src/server/cards/solaris/Mothership';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {CardResource} from '../../../src/common/CardResource';
import {fakeCard} from '../../TestingUtils';

describe('Mothership', () => {
  it('cannot play without 3 Space tags', () => {
    const card = new Mothership();
    const [/* game */, player] = testGame(1);

    player.tagsForTest = {space: 2};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {space: 3};
    expect(card.canPlay(player)).is.true;
  });

  it('canAct requires 1 energy and at least 1 fighter-capable card', () => {
    const card = new Mothership();
    const [/* game */, player] = testGame(1);

    player.energy = 0;
    expect(card.canAct(player)).is.false;

    player.energy = 1;
    // No fighter-capable cards played yet (card itself isn't in the tableau in this test).
    expect(card.canAct(player)).is.false;

    player.playedCards.push(card);
    expect(card.canAct(player)).is.true;
  });

  it('spends 1 energy and adds 1 fighter each to up to 2 selected cards, including itself', () => {
    const card = new Mothership();
    const [/* game */, player] = testGame(1);
    const other = fakeCard({resourceType: CardResource.FIGHTER});
    player.playedCards.push(card, other);
    player.energy = 2;

    const selectCard = cast(card.action(player), SelectCard);
    expect(selectCard.cards).has.members([card, other]);
    expect(selectCard.config.min).eq(1);
    expect(selectCard.config.max).eq(2);
    expect(player.energy).eq(1);

    selectCard.cb([card, other]);

    expect(card.resourceCount).eq(1);
    expect(other.resourceCount).eq(1);
  });

  it('offers only 1 target when only 1 fighter-capable card exists', () => {
    const card = new Mothership();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);
    player.energy = 1;

    const selectCard = cast(card.action(player), SelectCard);
    expect(selectCard.cards).deep.eq([card]);
    expect(selectCard.config.max).eq(1);
  });

  it('scores 1 VP per 3 fighters on this card only', () => {
    const card = new Mothership();
    const [/* game */, player] = testGame(1);

    card.resourceCount = 6;
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
