import {expect} from 'chai';
import {AceVeteranSquad} from '../../../src/server/cards/solaris/AceVeteranSquad';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('AceVeteranSquad', () => {
  it('adds 1 fighter when the player has fewer than 5 Space tags', () => {
    const card = new AceVeteranSquad();
    const [/* game */, player] = testGame(1);
    player.tagsForTest = {space: 4};

    cast(card.action(player), undefined);

    expect(card.resourceCount).eq(1);
  });

  it('adds 2 fighters when the player has 5 or more Space tags', () => {
    const card = new AceVeteranSquad();
    const [/* game */, player] = testGame(1);
    player.tagsForTest = {space: 5};

    cast(card.action(player), undefined);

    expect(card.resourceCount).eq(2);
  });

  it('canAct is always true', () => {
    const card = new AceVeteranSquad();
    const [/* game */, player] = testGame(1);

    expect(card.canAct(player)).is.true;
  });

  it('scores 1 VP per 2 fighters', () => {
    const card = new AceVeteranSquad();
    const [/* game */, player] = testGame(1);

    card.resourceCount = 5;
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
