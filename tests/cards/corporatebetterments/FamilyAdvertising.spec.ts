import {expect} from 'chai';
import {FamilyAdvertising} from '../../../src/server/cards/corporatebetterments/FamilyAdvertising';
import {AICentral} from '../../../src/server/cards/base/AICentral';
import {SpaceElevator} from '../../../src/server/cards/base/SpaceElevator';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {ICard} from '../../../src/server/cards/ICard';

describe('FamilyAdvertising', () => {
  let card: FamilyAdvertising;
  let game: IGame;
  let player: TestPlayer;
  let aiCentral: AICentral;
  let spaceElevator: SpaceElevator;

  beforeEach(() => {
    card = new FamilyAdvertising();
    [game, player] = testGame(1);
    aiCentral = new AICentral();
    spaceElevator = new SpaceElevator();
    player.playedCards.push(aiCentral, spaceElevator);
    player.steel = 2;
  });

  it('cannot play if no action has been used this generation', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('cannot play a used action that can no longer act', () => {
    player.actionsThisGeneration.add(spaceElevator.name);
    player.steel = 0;
    expect(card.canPlay(player)).is.false;
  });

  it('offers only the actions that were already used this generation and can still act', () => {
    player.actionsThisGeneration.add(aiCentral.name);
    player.steel = 0; // spaceElevator was not used, and also cannot act.

    const selectCard = cast(card.play(player), SelectCard<ICard>);
    expect(selectCard.cards).has.lengthOf(1);
    expect(selectCard.cards[0]?.name).to.eq(aiCentral.name);
    expect(selectCard.config.max).to.eq(1);
  });

  it('redoes 2 used actions on 2 active cards', () => {
    player.actionsThisGeneration.add(aiCentral.name);
    player.actionsThisGeneration.add(spaceElevator.name);
    expect(card.canPlay(player)).is.true;

    const handSizeBefore = player.cardsInHand.length;
    const megaCreditsBefore = player.megaCredits;
    const steelBefore = player.steel;

    const selectCard = cast(card.play(player), SelectCard<ICard>);
    expect(selectCard.cards).has.lengthOf(2);
    expect(selectCard.config.max).to.eq(2);

    selectCard.cb([aiCentral, spaceElevator]);
    runAllActions(game);

    expect(player.cardsInHand).has.lengthOf(handSizeBefore + 2);
    expect(player.megaCredits).to.eq(megaCreditsBefore + 5);
    expect(player.steel).to.eq(steelBefore - 1);
  });
});
