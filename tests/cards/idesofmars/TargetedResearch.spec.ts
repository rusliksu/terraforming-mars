import {expect} from 'chai';
import {TargetedResearch} from '../../../src/server/cards/idesofmars/TargetedResearch';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast, toName} from '../../../src/common/utils/utils';
import {CardName} from '../../../src/common/cards/CardName';
import {Tag} from '../../../src/common/cards/Tag';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {ColonizerTrainingCamp} from '../../../src/server/cards/base/ColonizerTrainingCamp';
import {SearchForLife} from '../../../src/server/cards/base/SearchForLife';

describe('TargetedResearch', () => {
  it('does not offer the wild tag as a search target', () => {
    const card = new TargetedResearch();
    const [/* game */, player] = testGame(2);

    cast(card.play(player), undefined);
    runAllActions(player.game);

    const options = cast(player.popWaitingFor(), OrOptions);
    expect(options.options.some((option) => option.title === Tag.WILD)).is.false;
  });

  it('reveals cards from the deck until one with the chosen tag is found, discarding the rest', () => {
    const card = new TargetedResearch();
    const [game, player] = testGame(2);

    cast(card.play(player), undefined);
    runAllActions(game);

    const options = cast(player.popWaitingFor(), OrOptions);
    const buildingOption = options.options.find((option) => option.title === Tag.BUILDING)!;

    const buildingCard = new ColonizerTrainingCamp();
    const scienceCard = new SearchForLife();
    game.projectDeck.drawPile.push(buildingCard, scienceCard);
    game.projectDeck.discardPile = [];

    buildingOption.cb();

    expect(player.cardsInHand.map(toName)).has.members([CardName.COLONIZER_TRAINING_CAMP]);
    expect(game.projectDeck.discardPile.map(toName)).deep.eq([CardName.SEARCH_FOR_LIFE]);
  });
});
