import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {InvestmentInsurance} from '../../../src/server/cards/idesofmars/InvestmentInsurance';
import {TestPlayer} from '../../TestPlayer';
import {Resource} from '../../../src/common/Resource';

describe('InvestmentInsurance', () => {
  let card: InvestmentInsurance;
  let player: TestPlayer;

  beforeEach(() => {
    card = new InvestmentInsurance();
    [/* game */, player] = testGame(1);
    player.playedCards.push(card);
  });

  it('decreases M€ production 1 step on play', () => {
    const startingProduction = player.production.megacredits;
    card.play(player);
    expect(player.production.megacredits).to.eq(startingProduction - 1);
  });

  it('restores 1 M€ production during the next production phase if nothing else changed it', () => {
    card.play(player);
    const afterPlay = player.production.megacredits;

    card.onProductionPhase(player);

    expect(player.production.megacredits).to.eq(afterPlay + 1);
  });

  it('does not add a bonus if the player already increased M€ production that generation', () => {
    card.play(player);
    player.production.add(Resource.MEGACREDITS, 2);
    const afterIncrease = player.production.megacredits;

    card.onProductionPhase(player);

    expect(player.production.megacredits).to.eq(afterIncrease);
  });

  it('does not grant a bonus again the following generation, once one manual increase has been seen', () => {
    card.play(player);
    player.production.add(Resource.MEGACREDITS, 2); // manual increase during generation 1
    const afterIncrease = player.production.megacredits;
    card.onProductionPhase(player); // generation 1 check: already increased, no bonus

    // Generation 2: nothing changes production before the check.
    card.onProductionPhase(player);

    expect(player.production.megacredits).to.eq(afterIncrease + 1);
  });

  it('keeps applying the bonus every generation nothing else raises M€ production', () => {
    card.play(player);
    const afterPlay = player.production.megacredits;

    card.onProductionPhase(player);
    expect(player.production.megacredits).to.eq(afterPlay + 1);

    // The card's own prior bonus is not itself treated as "you increased production": with
    // still no other change, it keeps applying again the next generation.
    card.onProductionPhase(player);
    expect(player.production.megacredits).to.eq(afterPlay + 2);
  });
});
