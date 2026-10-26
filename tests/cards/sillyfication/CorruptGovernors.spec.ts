import {expect} from 'chai';
import {CorruptGovernors} from '../../../src/server/cards/sillyfication/CorruptGovernors';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';

describe('CorruptGovernors', () => {
  let card: CorruptGovernors;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new CorruptGovernors();
    [game, player, player2] = testGame(2, {turmoilExtension: true});
  });

  it('requires that you are Chairman', () => {
    const turmoil = game.turmoil!;
    turmoil.chairman = 'NEUTRAL';
    expect(card.canPlay(player)).is.false;
    turmoil.chairman = player;
    expect(card.canPlay(player)).is.true;
  });

  it('raises every player influence by 3 and the owner by 3 more', () => {
    const turmoil = game.turmoil!;

    card.play(player);

    expect(turmoil.playersInfluenceBonus.get(player.id)).to.eq(6);
    expect(turmoil.playersInfluenceBonus.get(player2.id)).to.eq(3);
  });

  it('accumulates on repeated plays', () => {
    const turmoil = game.turmoil!;

    card.play(player);
    card.play(player);

    expect(turmoil.playersInfluenceBonus.get(player.id)).to.eq(12);
    expect(turmoil.playersInfluenceBonus.get(player2.id)).to.eq(6);
  });
});
