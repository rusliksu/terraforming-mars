import {expect} from 'chai';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {forceGenerationEnd, formatMessage} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {Neil} from '../../../src/server/cards/ceos/Neil';
import {MoonData} from '../../../src/server/moon/MoonData';
import {MoonExpansion} from '../../../src/server/moon/MoonExpansion';
import {LTFPrivileges} from '../../../src/server/cards/moon/LTFPrivileges';
import {ThoriumRush} from '../../../src/server/cards/moon/ThoriumRush';

describe('Neil', () => {
  let card: Neil;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;
  let moonData: MoonData;

  beforeEach(() => {
    card = new Neil();
    [game, player, player2] = testGame(2, {ceoExtension: true, moonExpansion: true});
    moonData = MoonExpansion.moonData(game);
  });

  it('Can act', () => {
    expect(card.canAct(player)).is.true;
  });

  it('Gains 1 M€ when any player plays a Moon tag', () => {
    player.playedCards.push(card);
    game.gameLog.length = 0;

    player.playCard(new LTFPrivileges());
    expect(player.megaCredits).eq(1);

    player2.playCard(new ThoriumRush());
    expect(player.megaCredits).eq(2);
    expect(game.gameLog.map(formatMessage)).contains('blue gained 1 M€ because of Neil');
  });

  it('Takes action: Gains M€ production equal to lowest Moon rate', () => {
    moonData.habitatRate = 5;
    moonData.logisticRate = 4;
    moonData.miningRate = 2;

    game.gameLog.length = 0;
    card.action(player);
    expect(player.production.megacredits).eq(2);
    expect(game.gameLog.map(formatMessage)).contains('blue gained 2 M€ production');
  });

  it('Takes action: Gains M€ production equal to lowest Moon rate, two rates the same', () => {
    moonData.habitatRate = 5;
    moonData.logisticRate = 3;
    moonData.miningRate = 3;

    card.action(player);
    expect(player.production.megacredits).eq(3);
  });

  it('Can only act once per game', () => {
    card.action(player);
    forceGenerationEnd(game);
    expect(card.isDisabled).is.true;
    expect(card.canAct(player)).is.false;
  });
});
