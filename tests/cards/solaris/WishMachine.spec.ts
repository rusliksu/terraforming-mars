import {expect} from 'chai';
import {WishMachine} from '../../../src/server/cards/solaris/WishMachine';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty, runAllActions} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {CardResource} from '../../../src/common/CardResource';
import {AppliedScience} from '../../../src/server/cards/prelude2/AppliedScience';

describe('WishMachine', () => {
  let card: WishMachine;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    card = new WishMachine();
    restoreShuffle = forcePartiesInPlay(PartyName.SCIENTISTS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('Cannot play without Scientists', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('Can play when Scientists rule', () => {
    setRulingParty(game, PartyName.SCIENTISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('canAct is false with no resource-holding cards in play', () => {
    expect(card.canAct(player)).is.false;
  });

  it('canAct is true once a card already holds a resource', () => {
    const scienceCard = new AppliedScience();
    player.playedCards.push(scienceCard);
    scienceCard.resourceCount = 1;

    expect(card.canAct(player)).is.true;
  });

  it('action adds a matching resource to the target card', () => {
    const scienceCard = new AppliedScience();
    player.playedCards.push(scienceCard);
    scienceCard.resourceCount = 2;

    expect(scienceCard.resourceType).to.eq(CardResource.SCIENCE);
    card.action(player);
    runAllActions(game);
    expect(scienceCard.resourceCount).to.eq(3);
  });
});
