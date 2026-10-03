import {expect} from 'chai';
import {CompanyRestructuring} from '../../../src/server/cards/corporatebetterments/CompanyRestructuring';
import {Fish} from '../../../src/server/cards/base/Fish';
import {SearchForLife} from '../../../src/server/cards/base/SearchForLife';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';

describe('CompanyRestructuring', () => {
  let card: CompanyRestructuring;
  let game: IGame;
  let player: TestPlayer;
  let opponent: TestPlayer;
  let fish: Fish;
  let searchForLife: SearchForLife;
  let opponentFish: Fish;

  beforeEach(() => {
    card = new CompanyRestructuring();
    [game, player, opponent] = testGame(2);
    fish = new Fish();
    searchForLife = new SearchForLife();
    opponentFish = new Fish();
    player.cardsInHand.push(fish, searchForLife);
    opponent.cardsInHand.push(opponentFish);
  });

  it('is worth 1 victory point', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('pays the player 3 M€ per discarded card, and opponents 2 M€ per discarded card', () => {
    const megaCreditsBefore = player.megaCredits;
    const opponentMegaCreditsBefore = opponent.megaCredits;

    card.play(player);

    const playerDiscard = cast(game.deferredActions.pop()?.execute(), SelectCard<IProjectCard>);
    playerDiscard.cb([fish, searchForLife]);

    const opponentDiscard = cast(game.deferredActions.pop()?.execute(), SelectCard<IProjectCard>);
    opponentDiscard.cb([opponentFish]);

    runAllActions(game);

    expect(player.cardsInHand).is.empty;
    expect(player.megaCredits).to.eq(megaCreditsBefore + 6);
    expect(opponent.cardsInHand).is.empty;
    expect(opponent.megaCredits).to.eq(opponentMegaCreditsBefore + 2);
  });

  it('opponents may choose to discard nothing', () => {
    const opponentMegaCreditsBefore = opponent.megaCredits;

    card.play(player);

    const playerDiscard = cast(game.deferredActions.pop()?.execute(), SelectCard<IProjectCard>);
    playerDiscard.cb([]);

    const opponentDiscard = cast(game.deferredActions.pop()?.execute(), SelectCard<IProjectCard>);
    opponentDiscard.cb([]);

    runAllActions(game);

    expect(opponent.cardsInHand).has.lengthOf(1);
    expect(opponent.megaCredits).to.eq(opponentMegaCreditsBefore);
  });
});
