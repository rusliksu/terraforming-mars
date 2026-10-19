import {expect} from 'chai';
import {Nepotism} from '../../../src/server/cards/sillyfication/Nepotism';
import {IGame} from '../../../src/server/IGame';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';
import {CardType} from '../../../src/common/cards/CardType';
import {testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';

describe('Nepotism', () => {
  let card: Nepotism;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Nepotism();
    [game, player] = testGame(2, {turmoilExtension: true});
    player.playedCards.push(card);
  });

  it('is a blue card with an Earth tag', () => {
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.tags).to.deep.eq([Tag.EARTH]);
  });

  it('adds 2 delegates to the reserve on play (7 -> 9)', () => {
    const turmoil = game.turmoil!;
    expect(turmoil.getAvailableDelegateCount(player)).to.eq(7);
    card.play(player);
    expect(turmoil.getAvailableDelegateCount(player)).to.eq(9);
  });

  it('gains 1 M€ whenever the owner sends a delegate', () => {
    const turmoil = game.turmoil!;
    player.megaCredits = 0;

    turmoil.sendDelegateToParty(player, PartyName.MARS, game);
    expect(player.megaCredits).to.eq(1);

    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    expect(player.megaCredits).to.eq(2);
  });

  it('does not gain M€ for neutral delegates or other players', () => {
    const [game2, p1, p2] = testGame(2, {turmoilExtension: true});
    const c = new Nepotism();
    p1.playedCards.push(c);
    p1.megaCredits = 0;

    game2.turmoil!.sendDelegateToParty('NEUTRAL', PartyName.MARS, game2);
    game2.turmoil!.sendDelegateToParty(p2, PartyName.MARS, game2);

    expect(p1.megaCredits).to.eq(0);
  });
});
