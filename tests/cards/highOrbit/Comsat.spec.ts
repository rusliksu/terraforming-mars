import {expect} from 'chai';
import {Comsat} from '../../../src/server/cards/highOrbit/Comsat';
import {Titan} from '../../../src/server/colonies/Titan';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('Comsat', () => {
  let card: Comsat;
  let titan: Titan;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Comsat();
    titan = new Titan();
    [game, player, player2] = testGame(2, {coloniesExtension: true});
    game.colonies.push(titan);
  });

  it('cannot play without more Space tags than Infrastructure tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {[Tag.SPACE]: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('gains 1 M€ when this player trades', () => {
    player.playedCards.push(card);
    player.megaCredits = 0;

    titan.trade(player);

    expect(player.megaCredits).to.eq(1);
  });

  it('does not gain M€ when another player trades', () => {
    player.playedCards.push(card);
    player.megaCredits = 0;
    player2.megaCredits = 0;

    titan.trade(player2);

    expect(player.megaCredits).to.eq(0);
    expect(player2.megaCredits).to.eq(0);
  });

  it('gains 1 M€ per trade, even without this card owner using a trade fleet', () => {
    player.playedCards.push(card);
    player.megaCredits = 0;

    titan.trade(player);
    titan.trade(player, {usesTradeFleet: false});

    expect(player.megaCredits).to.eq(2);
  });
});
