import {expect} from 'chai';
import {Blockhouse} from '../../../src/server/cards/sillyfication/Blockhouse';
import {CorporateStronghold} from '../../../src/server/cards/base/CorporateStronghold';
import {SmeltingPods} from '../../../src/server/cards/sillyfication/SmeltingPods';
import {CityStandardProject} from '../../../src/server/cards/base/standardProjects/CityStandardProject';
import {CardName} from '../../../src/common/cards/CardName';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Payment} from '../../../src/common/inputs/Payment';

describe('Blockhouse', () => {
  let card: Blockhouse;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Blockhouse();
    [/* game */, player] = testGame(2);
  });

  it('allows steel to pay for the City standard project', () => {
    const sp = new CityStandardProject();
    expect(sp.canPayWith(player)).to.deep.eq({});

    player.playedCards.push(card);
    expect(sp.canPayWith(player)).to.deep.eq({steel: true});
  });

  it('makes steel worth 2 M€ extra when paying for a City-tagged card', () => {
    player.playedCards.push(card);
    const cityCard = new CorporateStronghold(); // City+Building, cost 11, taxed to 14 by Blockhouse's own effect
    player.steel = 4;
    player.megaCredits = 0;

    // 4 steel at the boosted value (2 base + 2 bonus = 4 each = 16) covers the taxed cost of 14;
    // at the un-boosted value (2 each = 8) it would not.
    expect(() => player.checkPaymentAndPlayCard(cityCard, Payment.of({steel: 4}))).to.not.throw();
  });

  it('does not boost steel for a City-tagged card without Blockhouse in play', () => {
    const cityCard = new CorporateStronghold();
    player.steel = 3;
    player.megaCredits = 0;

    expect(() => player.checkPaymentAndPlayCard(cityCard, Payment.of({steel: 3}))).to.throw();
  });

  it('does not boost steel for a Building-only card, even with Blockhouse in play', () => {
    player.playedCards.push(card);
    const buildingCard = new SmeltingPods(); // Building only, cost 15
    player.steel = 5;
    player.megaCredits = 0;

    // At the boosted value (4 each = 20) this would cover the cost of 15; at the
    // un-boosted value (2 each = 10) it should not.
    expect(() => player.checkPaymentAndPlayCard(buildingCard, Payment.of({steel: 5}))).to.throw();
  });

  it('makes the City standard project actable when only the boosted steel value covers its cost', () => {
    const sp = new CityStandardProject();
    player.steel = 7; // 7*2=14 (unboosted) is short of the 25 cost; 7*4=28 (boosted) covers it.
    player.megaCredits = 0;

    expect(sp.canAct(player)).is.false;

    player.playedCards.push(card);
    expect(sp.canAct(player)).is.true;
  });

  it('actually pays out at the boosted rate when playing the City standard project', () => {
    player.playedCards.push(card);
    player.steel = 7;
    player.megaCredits = 0;

    const spOption = player.getStandardProjectOption();
    expect(spOption.cards.some((c) => c.name === CardName.CITY_STANDARD_PROJECT)).is.true;

    const productionBefore = player.production.megacredits;
    spOption.process({type: 'projectCard', card: CardName.CITY_STANDARD_PROJECT, payment: Payment.of({steel: 7})});

    // The payment (7 steel, deducted synchronously in payAndExecute) and the production
    // bump happen immediately; placing the city tile itself is a deferred action not
    // resolved here.
    expect(player.steel).to.eq(0);
    expect(player.production.megacredits).to.eq(productionBefore + 1);
  });

  it('makes a City-tagged card cost 3 M€ more for an opponent', () => {
    const [, owner, opponent] = testGame(2);
    owner.playedCards.push(card);
    const cityCard = new CorporateStronghold(); // City+Building, cost 11

    expect(opponent.getCardCost(cityCard)).to.eq(14);
  });

  it('also taxes the Blockhouse owner\'s own City-tagged plays', () => {
    const [, owner] = testGame(2);
    owner.playedCards.push(card);
    const cityCard = new CorporateStronghold();

    expect(owner.getCardCost(cityCard)).to.eq(14);
  });

  it('does not tax a non-City card for an opponent', () => {
    const [, owner, opponent] = testGame(2);
    owner.playedCards.push(card);
    const buildingCard = new SmeltingPods(); // Building only, cost 15

    expect(opponent.getCardCost(buildingCard)).to.eq(15);
  });

  it('makes the City standard project cost 3 M€ more for an opponent', () => {
    const [, owner, opponent] = testGame(2);
    owner.playedCards.push(card);
    const sp = new CityStandardProject();

    expect(sp.getAdjustedCost(opponent)).to.eq(28);
  });

  it('also taxes the Blockhouse owner\'s own City standard project use', () => {
    const [, owner] = testGame(2);
    owner.playedCards.push(card);
    const sp = new CityStandardProject();

    expect(sp.getAdjustedCost(owner)).to.eq(28);
  });
});
