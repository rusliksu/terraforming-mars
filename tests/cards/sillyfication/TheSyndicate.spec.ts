import {expect} from 'chai';
import {TheSyndicate} from '../../../src/server/cards/sillyfication/TheSyndicate';
import {BribedCommittee} from '../../../src/server/cards/base/BribedCommittee';
import {Research} from '../../../src/server/cards/base/Research';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {cast} from '../../../src/common/utils/utils';
import {SelectParty} from '../../../src/server/inputs/SelectParty';

describe('TheSyndicate', () => {
  let card: TheSyndicate;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new TheSyndicate();
    [game, player] = testGame(1, {underworldExpansion: true, turmoilExtension: true});
  });

  it('starts with 50 M€, -5 VP, and +1 influence', () => {
    const turmoil = Turmoil.getTurmoil(game);
    const influenceBefore = turmoil.getInfluence(player);

    player.playCorporationCard(card);
    runAllActions(game);

    expect(player.megaCredits).eq(50);
    expect(card.getVictoryPoints(player)).eq(-5);
    expect(turmoil.getInfluence(player)).eq(influenceBefore + 1);
  });

  it('triggers its own negative-VP ability when played, since it is -5 VP itself', () => {
    player.underworldData.corruption = 0;

    player.playCorporationCard(card);
    runAllActions(game);

    expect(player.underworldData.corruption).eq(1);
    cast(player.popWaitingFor(), SelectParty);
  });

  it('gains 1 corruption and sends a delegate when playing a card with negative VP', () => {
    player.playedCards.push(card);
    player.underworldData.corruption = 0;

    const bribedCommittee = new BribedCommittee(); // -2 VP
    card.onCardPlayed(player, bribedCommittee);
    runAllActions(game);

    expect(player.underworldData.corruption).eq(1);
    cast(player.popWaitingFor(), SelectParty);
  });

  it('does not trigger on a card with non-negative VP', () => {
    player.playedCards.push(card);
    player.underworldData.corruption = 0;

    const research = new Research(); // 1 VP
    card.onCardPlayed(player, research);
    runAllActions(game);

    expect(player.underworldData.corruption).eq(0);
    expect(player.popWaitingFor()).is.undefined;
  });

  it('action spends 1 corruption to permanently add 1 delegate to reserve', () => {
    player.playedCards.push(card);
    player.underworldData.corruption = 1;
    const turmoil = Turmoil.getTurmoil(game);
    const before = turmoil.delegateReserve.get(player);

    expect(card.canAct(player)).is.true;
    cast(card.action(player), undefined);

    expect(player.underworldData.corruption).eq(0);
    expect(turmoil.delegateReserve.get(player)).eq(before + 1);
  });

  it('cannot act without 1 corruption', () => {
    player.playedCards.push(card);
    player.underworldData.corruption = 0;

    expect(card.canAct(player)).is.false;
  });
});
