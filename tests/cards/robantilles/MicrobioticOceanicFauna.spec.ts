import {expect} from 'chai';
import {MicrobioticOceanicFauna} from '../../../src/server/cards/robantilles/MicrobioticOceanicFauna';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {maxOutOceans} from '../../TestingUtils';
import {Tardigrades} from '../../../src/server/cards/base/Tardigrades';

describe('MicrobioticOceanicFauna', () => {
  let card: MicrobioticOceanicFauna;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MicrobioticOceanicFauna();
    [/* game */, player] = testGame(2);
  });

  it('cannot play without 3 oceans', () => {
    expect(card.canPlay(player)).is.not.true;
  });

  it('can play with 3 oceans', () => {
    maxOutOceans(player, 3);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
  });

  it('discounts cards with a microbe tag by 3 M€', () => {
    player.playedCards.push(card);
    const microbeCard = new Tardigrades();
    expect(player.getCardCost(microbeCard)).to.eq(microbeCard.cost - 3);
  });
});
