import {expect} from 'chai';
import {AntiFraudInvestigation} from '../../../src/server/cards/solaris/AntiFraudInvestigation';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay, forceGenerationEnd, fakeCard} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {CardResource} from '../../../src/common/CardResource';
import {RemoveResourcesFromCard} from '../../../src/server/deferredActions/RemoveResourcesFromCard';

describe('AntiFraudInvestigation', () => {
  let card: AntiFraudInvestigation;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.CENTRISTS);
    card = new AntiFraudInvestigation();
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without the Centrists ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.CENTRISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('blocks resource removal from any card for the rest of the generation', () => {
    setRulingParty(game, PartyName.CENTRISTS);

    const target = fakeCard({resourceType: CardResource.FIGHTER});
    player.playedCards.push(target);
    target.resourceCount = 2;

    expect(RemoveResourcesFromCard.getAvailableTargetCards(player, CardResource.FIGHTER, 'all')).deep.eq([target]);

    expect(game.resourceRemovalBlockedThisGeneration).is.false;
    card.play(player);
    expect(game.resourceRemovalBlockedThisGeneration).is.true;

    expect(RemoveResourcesFromCard.getAvailableTargetCards(player, CardResource.FIGHTER, 'all')).deep.eq([]);
  });

  it('resets at the start of the next generation', () => {
    setRulingParty(game, PartyName.CENTRISTS);
    card.play(player);
    expect(game.resourceRemovalBlockedThisGeneration).is.true;

    forceGenerationEnd(game);

    expect(game.resourceRemovalBlockedThisGeneration).is.false;
  });
});
