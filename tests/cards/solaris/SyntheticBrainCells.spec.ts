import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {runAllActions, forcePartiesInPlay} from '../../TestingUtils';
import {SyntheticBrainCells} from '../../../src/server/cards/solaris/SyntheticBrainCells';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('SyntheticBrainCells', () => {
  let card: SyntheticBrainCells;
  let player: TestPlayer;
  let game: IGame;
  let turmoil: Turmoil;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SCIENTISTS, PartyName.TRANSHUMANISTS);
    card = new SyntheticBrainCells();
    [game, player] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
    turmoil = game.turmoil!;
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play unless Transhumanists rule or you have 2 delegates there', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.SCIENTISTS);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('can play when Transhumanists are ruling', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.TRANSHUMANISTS);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without 2 M€', () => {
    player.playedCards.push(card);
    player.megaCredits = 1;
    expect(card.canAct(player)).is.false;
  });

  it('action spends 2 M€ to add 1 microbe to this card (the only eligible card)', () => {
    player.playedCards.push(card);
    player.megaCredits = 2;
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(card.resourceCount).to.eq(1);
  });

  it('awards 1 VP for every 2nd microbe on this card', () => {
    player.addResourceTo(card, 5);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
