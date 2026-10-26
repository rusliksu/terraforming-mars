import {expect} from 'chai';
import {cardsToModel} from '../../src/server/models/ModelUtils';
import {Tag} from '../../src/common/cards/Tag';
import {CardName} from '../../src/common/cards/CardName';
import {Venuphile} from '../../src/server/cards/sillyfication/Venuphile';
import {InSpire} from '../../src/server/cards/pathfinders/InSpire';
import {DeimosDoubleDownCopy} from '../../src/server/cards/sillyfication/DeimosDoubleDownCopy';
import {NitrogenRichAsteroid} from '../../src/server/cards/base/NitrogenRichAsteroid';
import {fakeCard} from '../TestingUtils';
import {TestPlayer} from '../TestPlayer';
import {testGame} from '../TestGame';

describe('cardsToModel', () => {
  let player: TestPlayer;

  beforeEach(() => {
    [/* game */, player] = testGame(2);
  });

  it('sets no combinedDisplayName for an unaffected card', () => {
    const card = fakeCard({});

    const [model] = cardsToModel(player, [card]);

    expect(model.combinedDisplayName).is.undefined;
  });

  it('recalculates Venuphile\'s discount live from the player\'s current Venus tag count', () => {
    const card = new Venuphile();

    player.tagsForTest = {venus: 3};
    expect(cardsToModel(player, [card])[0].discount).to.deep.eq([{tag: Tag.VENUS, amount: 1}]);

    player.tagsForTest = {venus: 4};
    expect(cardsToModel(player, [card])[0].discount).to.deep.eq([{tag: Tag.VENUS, amount: 2}]);

    player.tagsForTest = {venus: 16};
    expect(cardsToModel(player, [card])[0].discount).to.deep.eq([{tag: Tag.VENUS, amount: 5}]);
  });

  it('carries InSpire\'s currently stored resources over to the model, empty by default', () => {
    const card = new InSpire();

    expect(cardsToModel(player, [card])[0].inSpireResources).to.deep.eq([]);

    card.data = {steel: 1, microbe: 2};
    const items = cardsToModel(player, [card])[0].inSpireResources;
    expect(items).has.lengthOf(2);
  });

  it('leaves inSpireResources undefined for every other card', () => {
    const card = fakeCard({});
    expect(cardsToModel(player, [card])[0].inSpireResources).is.undefined;
  });

  it('sends DeimosDoubleDownCopy\'s real wrapped-card face over the wire as customCard', () => {
    const card = new DeimosDoubleDownCopy(CardName.NITROGEN_RICH_ASTEROID);
    const source = new NitrogenRichAsteroid();

    const [model] = cardsToModel(player, [card]);

    expect(model.customCard).is.not.undefined;
    expect(model.customCard!.tags).to.deep.eq(source.tags);
    expect(model.customCard!.cost).to.eq(source.cost);
    expect(model.customCard!.metadata).to.eq(source.metadata);
  });

  it('shows DeimosDoubleDownCopy\'s displayed title as "<real card> Copy"', () => {
    const card = new DeimosDoubleDownCopy(CardName.NITROGEN_RICH_ASTEROID);

    const [model] = cardsToModel(player, [card]);

    expect(model.combinedDisplayName).to.eq('Nitrogen-Rich Asteroid Copy');
  });
});
