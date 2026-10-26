import {expect} from 'chai';
import {testGame} from '../TestGame';
import {runAllActions} from '../TestingUtils';
import {SpaceBonus} from '../../src/common/boards/SpaceBonus';
import {MartianExpress} from '../../src/server/cards/underworld/MartianExpress';
import {JupiterFloatingStation} from '../../src/server/cards/colonies/JupiterFloatingStation';
import {SelectCard} from '../../src/server/inputs/SelectCard';
import {cast} from '../../src/common/utils/utils';

describe('Game.grantSpaceBonus with SpaceBonus.FLOATER', () => {
  it('adds a floater to a floater-collecting card the player picks among', () => {
    const [game, player] = testGame(2);
    const card = new MartianExpress();
    player.playedCards.push(card);

    game.grantSpaceBonus(player, SpaceBonus.FLOATER);
    runAllActions(game);
    cast(player.popWaitingFor(), undefined);

    expect(card.resourceCount).to.eq(1);
  });

  it('does nothing when the player has no floater-collecting card in play', () => {
    const [game, player] = testGame(2);

    game.grantSpaceBonus(player, SpaceBonus.FLOATER);
    runAllActions(game);

    expect(player.popWaitingFor()).is.undefined;
  });

  it('respects the count for multiple placement-bonus floaters', () => {
    const [game, player] = testGame(2);
    const card = new MartianExpress();
    player.playedCards.push(card);

    game.grantSpaceBonus(player, SpaceBonus.FLOATER, 2);
    runAllActions(game);
    cast(player.popWaitingFor(), undefined);

    expect(card.resourceCount).to.eq(2);
  });

  it('lets the player choose among multiple floater-collecting cards', () => {
    const [game, player] = testGame(2);
    const card = new MartianExpress();
    const other = new JupiterFloatingStation();
    player.playedCards.push(card, other);

    game.grantSpaceBonus(player, SpaceBonus.FLOATER);
    runAllActions(game);
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    selectCard.cb([card]);

    expect(card.resourceCount).to.eq(1);
    expect(other.resourceCount).to.eq(0);
  });
});
