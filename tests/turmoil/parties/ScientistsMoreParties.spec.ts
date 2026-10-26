import {expect} from 'chai';
import {ScientistsMoreParties} from '../../../src/server/turmoil/parties/ScientistsMoreParties';
import {SCIENTISTS_BONUS_1, SCIENTISTS_BONUS_2, SCIENTISTS_POLICY_2} from '../../../src/server/turmoil/parties/Scientists';
import {SCIENTISTS_MORE_PARTIES_POLICY_1, SCIENTISTS_MORE_PARTIES_POLICY_4} from '../../../src/server/turmoil/parties/ScientistsMoreParties';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';

describe('ScientistsMoreParties', () => {
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SCIENTISTS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('reuses the exact same bonus A/B and policy 2 objects as vanilla Scientists', () => {
    const party = new ScientistsMoreParties();
    expect(party.bonuses[0]).to.eq(SCIENTISTS_BONUS_1);
    expect(party.bonuses[1]).to.eq(SCIENTISTS_BONUS_2);
    expect(party.policies[1]).to.eq(SCIENTISTS_POLICY_2);
  });

  it('policy 1: applies +2 extra science tags to every player while ruling, removes it when it ends', () => {
    expect(player.tags.extraScienceTags).to.eq(0);
    setRulingParty(game, PartyName.SCIENTISTS, 'sp01');
    expect(player.tags.extraScienceTags).to.eq(2);
    expect(player.tags.count(Tag.SCIENCE)).to.eq(2);

    SCIENTISTS_MORE_PARTIES_POLICY_1.onPolicyEndForPlayer(player);
    expect(player.tags.extraScienceTags).to.eq(0);
  });

  it('policy 3: draws and discards a card when a Mars parameter is raised', () => {
    setRulingParty(game, PartyName.SCIENTISTS, 'sp03');
    const beforeHand = player.cardsInHand.length;
    const beforeDiscardPile = game.projectDeck.discardPile.length;
    game.increaseOxygenLevel(player, 1);
    game.deferredActions.runAll(() => {});

    // Drew 1, then was forced to discard from a 1-card hand (min===hand size auto-resolves).
    expect(player.cardsInHand.length).to.eq(beforeHand);
    expect(game.projectDeck.discardPile.length).to.eq(beforeDiscardPile + 1);
  });

  it('policy 4: choosing the science tag (the only option) pays 4 M€ and draws a science card', () => {
    player.megaCredits = 10;
    expect(SCIENTISTS_MORE_PARTIES_POLICY_4.canAct(player)).is.true;
    SCIENTISTS_MORE_PARTIES_POLICY_4.action(player);
    game.deferredActions.runAll(() => {});
    expect(player.megaCredits).to.eq(6);
    expect(player.cardsInHand).to.have.lengthOf(1);
    expect(player.cardsInHand[0].tags).to.include(Tag.SCIENCE);
  });
});
