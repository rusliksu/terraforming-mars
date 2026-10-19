import {expect} from 'chai';
import {Clonation} from '../../../src/server/cards/robantilles/Clonation';
import {Fish} from '../../../src/server/cards/base/Fish';
import {Pets} from '../../../src/server/cards/base/Pets';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {setRulingParty} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('Clonation', () => {
  let card: Clonation;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Clonation();
    [game, player] = testGame(2, {turmoilExtension: true});
  });

  it('cannot play without the Scientists ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.SCIENTISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('adds 1 Animal to every card that already has at least 1 Animal', () => {
    setRulingParty(game, PartyName.SCIENTISTS);

    const emptyFish = new Fish();
    emptyFish.resourceCount = 0;
    const stockedPets = new Pets();
    stockedPets.resourceCount = 2;
    player.playedCards.push(emptyFish, stockedPets);

    cast(card.play(player), undefined);

    expect(emptyFish.resourceCount).eq(0);
    expect(stockedPets.resourceCount).eq(3);
  });
});
