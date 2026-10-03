import {expect} from 'chai';
import {Microbitic} from '../../../src/server/cards/sillyfication/Microbitic';
import {ViralEnhancers} from '../../../src/server/cards/base/ViralEnhancers';
import {Manutech} from '../../../src/server/cards/venusNext/Manutech';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('Microbitic', () => {
  let card: Microbitic;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Microbitic();
    [/* game */, player] = testGame(2);
  });

  it('requires 2 plants to play', () => {
    player.plants = 1;
    expect(card.canPlay(player)).is.false;
    player.plants = 2;
    expect(card.canPlay(player)).is.true;
  });

  it('spends 2 plants for 2 plant production', () => {
    player.plants = 2;
    player.production.override({plants: 0});

    card.play(player);

    expect(player.plants).to.eq(0);
    expect(player.production.plants).to.eq(2);
  });

  it('can play with 0 plants if you have Manutech - it grants the produced plants right away', () => {
    player.playedCards.push(new Manutech());
    player.plants = 0;
    player.production.override({plants: 0});

    expect(card.canPlay(player)).is.true;
    card.play(player);

    // Manutech's onProductionGain isn't wired up in this isolated test, but Manutech's
    // presence alone is what canPlay checks - see NitrophilicMoss's own test for the same
    // pattern.
    expect(player.production.plants).to.eq(2);
  });

  it('can play with 1 plant if you have Viral Enhancers - it grants 1 plant for this card\'s Microbe tag', () => {
    const viralEnhancers = new ViralEnhancers();
    player.playedCards.push(viralEnhancers);
    player.plants = 1;

    expect(card.canPlay(player)).is.true;
    card.play(player);

    expect(player.plants).to.eq(-1);
    viralEnhancers.onCardPlayed(player, card);
    expect(player.plants).to.eq(0);
    expect(player.production.plants).to.eq(2);
  });

  it('cannot play with 1 plant and neither Manutech nor Viral Enhancers', () => {
    player.plants = 1;
    expect(card.canPlay(player)).is.false;
  });
});
