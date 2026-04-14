import {expect} from 'chai';
import {Donation} from '../../../src/server/cards/prelude/Donation';
import {GalileanMining} from '../../../src/server/cards/prelude/GalileanMining';
import {HugeAsteroid} from '../../../src/server/cards/prelude/HugeAsteroid';
import {NewPartner} from '../../../src/server/cards/promo/NewPartner';
import {StrategicBasePlanning} from '../../../src/server/cards/promo/StrategicBasePlanning';
import {SmeltingPlant} from '../../../src/server/cards/prelude/SmeltingPlant';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast, runAllActions} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IPreludeCard, isPreludeCard} from '../../../src/server/cards/prelude/IPreludeCard';

describe('NewPartner', () => {
  let card: NewPartner;
  let player: TestPlayer;
  let game: IGame;
  let smeltingPlant: IPreludeCard;
  let donation: IPreludeCard;
  let hugeAsteroid: IPreludeCard;
  let galileanMining: IPreludeCard;
  let strategicBasePlanning: IPreludeCard;

  beforeEach(() => {
    card = new NewPartner();
    [game, player] = testGame(2, {preludeExtension: true});
    smeltingPlant = new SmeltingPlant();
    donation = new Donation();
    hugeAsteroid = new HugeAsteroid();
    galileanMining = new GalileanMining();
    strategicBasePlanning = new StrategicBasePlanning();
  });

  it('Should play with at least 1 playable prelude', () => {
    game.preludeDeck.drawPile.push(smeltingPlant, donation);

    const selectCard = cast(card.play(player), SelectCard<IPreludeCard>);

    expect(selectCard.cards).deep.eq([donation, smeltingPlant]);
    selectCard.cb([selectCard.cards[0]]);

    expect(player.production.megacredits).to.eq(1);
    expect(player.playedCards.asArray().every((card) => isPreludeCard(card))).is.true;
  });

  it('Should discard the prelude that was not chosen', () => {
    game.preludeDeck.drawPile.push(smeltingPlant, donation);

    const selectCard = cast(card.play(player), SelectCard<IPreludeCard>);
    expect(selectCard.cards).deep.eq([donation, smeltingPlant]);
    selectCard.cb([donation]);

    expect(game.preludeDeck.discardPile).to.have.members([smeltingPlant]);
  });

  it('Can play with no playable preludes drawn', () => {
    player.megaCredits = 0;
    // Both of these cards cost MC which the player does not have, and so
    // if the player plays this they will have to fizzle one of the cards.
    game.preludeDeck.drawPile.push(hugeAsteroid, galileanMining);

    const selectCard = cast(card.play(player), SelectCard<IPreludeCard>);
    expect(selectCard.cards).deep.eq([galileanMining, hugeAsteroid]);
    selectCard.cb([selectCard.cards[0]]);
    runAllActions(game);
    expect(player.megaCredits).eq(15);
  });

  it('Should warn but still allow selecting an unplayable prelude when a playable alternative exists', () => {
    player.megaCredits = 1;
    game.preludeDeck.drawPile.push(donation, strategicBasePlanning);

    const selectCard = cast(card.play(player), SelectCard<IPreludeCard>);
    const strategicIndex = selectCard.cards.findIndex((card) => card.name === strategicBasePlanning.name);
    const donationIndex = selectCard.cards.findIndex((card) => card.name === donation.name);

    expect(strategicIndex).not.eq(-1);
    expect(donationIndex).not.eq(-1);
    expect(selectCard.config.enabled).eq(undefined);
    expect(Array.from(selectCard.cards[strategicIndex].warnings)).contains('preludeFizzle');
    selectCard.cb([selectCard.cards[strategicIndex]]);
    runAllActions(game);
    expect(player.megaCredits).eq(16);
  });
});
