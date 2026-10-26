import {expect} from 'chai';
import {MineralDeposit, MineralDepositRebalanced} from '../../../src/server/cards/base/MineralDeposit';
import {testGame} from '../../TestGame';
import {cast} from '@/common/utils/utils';
import {deserializeProjectCard, serializeProjectCard} from '@/server/cards/cardSerialization';
import {CardName} from '@/common/cards/CardName';
import {Game} from '@/server/Game';

describe('MineralDeposit', () => {
  it('Should play', () => {
    const card = new MineralDeposit();
    const [/* game */, player] = testGame(2);
    cast(card.play(player), undefined);
    expect(player.steel).to.eq(5);
  });

  it('keeps the test variant cost and steel effect after card serialization', () => {
    const card = deserializeProjectCard(serializeProjectCard(new MineralDepositRebalanced()));
    const [/* game */, player] = testGame(2);
    expect(card.cost).to.eq(6);
    expect(player.getCardCost(card)).to.eq(6);
    cast(card.play(player), undefined);
    expect(player.steel).to.eq(5);
    expect(new MineralDeposit().cost).to.eq(5);
  });

  it('restores the selected variant in a saved game', () => {
    const [game, player] = testGame(2, {includedCards: [CardName.MINERAL_DEPOSIT_REBALANCED]});
    player.cardsInHand.push(new MineralDepositRebalanced());

    const restored = Game.deserialize(game.serialize(), {simulation: true});
    expect(restored.gameOptions.includedCards).to.include(CardName.MINERAL_DEPOSIT_REBALANCED);
    expect(restored.players[0].cardsInHand.find((card) => card.name === CardName.MINERAL_DEPOSIT_REBALANCED)?.cost).to.eq(6);
  });
});
