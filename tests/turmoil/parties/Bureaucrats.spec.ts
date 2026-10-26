import {expect} from 'chai';
import {
  BUREAUCRATS_BONUS_1,
  BUREAUCRATS_BONUS_2,
  BUREAUCRATS_POLICY_1,
  BUREAUCRATS_POLICY_4,
} from '../../../src/server/turmoil/parties/Bureaucrats';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {ImportedNitrogen} from '../../../src/server/cards/base/ImportedNitrogen';
import {CardType} from '../../../src/common/cards/CardType';
import {TurmoilHandler} from '../../../src/server/turmoil/TurmoilHandler';

describe('Bureaucrats', () => {
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.BUREAUCRATS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('bonus A: scores and grants 2 M€ per delegate the player has across all parties', () => {
    expect(BUREAUCRATS_BONUS_1.getScore(player)).to.eq(0);
    game.turmoil!.sendDelegateToParty(player, PartyName.GREENS, game);
    expect(BUREAUCRATS_BONUS_1.getScore(player)).to.eq(1);
    game.turmoil!.sendDelegateToParty(player, PartyName.BUREAUCRATS, game);
    expect(BUREAUCRATS_BONUS_1.getScore(player)).to.eq(2);

    const before = player.megaCredits;
    BUREAUCRATS_BONUS_1.grantForPlayer(player);
    expect(player.megaCredits).to.eq(before + 4);
  });

  it('bonus B: scores and grants 2 M€ per influence', () => {
    expect(BUREAUCRATS_BONUS_2.getScore(player)).to.eq(0);
    game.turmoil!.addInfluenceBonus(player, 2);
    expect(BUREAUCRATS_BONUS_2.getScore(player)).to.eq(2);

    const before = player.megaCredits;
    BUREAUCRATS_BONUS_2.grantForPlayer(player);
    expect(player.megaCredits).to.eq(before + 4);
  });

  it('policy 3: gains 3 M€ every time the player places a delegate, in any party', () => {
    setRulingParty(game, PartyName.BUREAUCRATS, 'burp03');
    const before = player.megaCredits;
    game.turmoil!.sendDelegateToParty(player, PartyName.GREENS, game);
    expect(player.megaCredits).to.eq(before + 3);
  });

  it('policy 3: has no effect when Bureaucrats is not ruling with that policy', () => {
    const before = player.megaCredits;
    game.turmoil!.sendDelegateToParty(player, PartyName.GREENS, game);
    expect(player.megaCredits).to.eq(before);
  });

  it('policy 4: forces a discard on card play, except for the chairman', () => {
    setRulingParty(game, PartyName.BUREAUCRATS, 'burp04');
    player.cardsInHand = [new ImportedNitrogen()];
    const beforeHand = player.cardsInHand.length;
    const beforeDiscardPile = game.projectDeck.discardPile.length;

    BUREAUCRATS_POLICY_4.onCardPlayed(player, new ImportedNitrogen());
    game.deferredActions.runAll(() => {});

    expect(player.cardsInHand.length).to.eq(beforeHand - 1);
    expect(game.projectDeck.discardPile.length).to.eq(beforeDiscardPile + 1);
  });

  it('policy 4: does not force a discard for the chairman', () => {
    setRulingParty(game, PartyName.BUREAUCRATS, 'burp04');
    game.turmoil!.chairman = player;
    player.cardsInHand = [new ImportedNitrogen()];
    const beforeHand = player.cardsInHand.length;

    BUREAUCRATS_POLICY_4.onCardPlayed(player, new ImportedNitrogen());
    game.deferredActions.runAll(() => {});

    expect(player.cardsInHand.length).to.eq(beforeHand);
  });

  it('policy 1: pays 5 M€ and draws an Active card', () => {
    player.megaCredits = 10;
    expect(BUREAUCRATS_POLICY_1.canAct(player)).is.true;
    BUREAUCRATS_POLICY_1.action(player);
    game.deferredActions.runAll(() => {});
    expect(player.megaCredits).to.eq(5);
    expect(player.cardsInHand).to.have.lengthOf(1);
    expect(player.cardsInHand[0].type).to.eq(CardType.ACTIVE);
  });

  it('policy 1 cannot act without enough M€', () => {
    player.megaCredits = 0;
    expect(BUREAUCRATS_POLICY_1.canAct(player)).is.false;
  });

  it('policy 2: pays 3 M€ minus influence at the start of a turn, while ruling', () => {
    setRulingParty(game, PartyName.BUREAUCRATS, 'burp02');
    player.megaCredits = 10;
    game.turmoil!.addInfluenceBonus(player, 1);

    TurmoilHandler.applyOnTurnStartEffect(player);
    game.deferredActions.runAll(() => {});

    expect(player.megaCredits).to.eq(8); // 10 - (3 - 1)
  });

  it('policy 2: no charge once influence covers the full 3 M€', () => {
    setRulingParty(game, PartyName.BUREAUCRATS, 'burp02');
    player.megaCredits = 10;
    game.turmoil!.addInfluenceBonus(player, 3);

    TurmoilHandler.applyOnTurnStartEffect(player);
    game.deferredActions.runAll(() => {});

    expect(player.megaCredits).to.eq(10);
  });

  it('policy 2: has no effect when Bureaucrats is not ruling with that policy', () => {
    player.megaCredits = 10;

    TurmoilHandler.applyOnTurnStartEffect(player);
    game.deferredActions.runAll(() => {});

    expect(player.megaCredits).to.eq(10);
  });
});
