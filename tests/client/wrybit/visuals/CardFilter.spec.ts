import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {CardModel} from '@/common/models/CardModel';
import {cardFilterOptions, emptyCardFilter, matchesCardFilter} from '@/client/wrybit/visuals/cardfilter/cardFilter';

describe('Wrybit card filtering with our metadata and availability', () => {
  it('uses custom wire metadata, clone replacement, Galactic and the supplied discounted price', () => {
    const card: CardModel = {name: 'Synthetic custom UI card' as CardName, calculatedCost: 7, cloneTag: Tag.SPACE,
      customCard: {type: CardType.ACTIVE, cost: 20, tags: [Tag.CLONE, Tag.GALACTIC], module: 'base',
        metadata: {description: 'Synthetic public fixture', victoryPoints: 1}, compatibility: []}};
    const context = {withCost: true, playable: new Set([card.name])};
    const filter = emptyCardFilter();
    filter.tags.add(Tag.SPACE);
    filter.maxCost = 7;
    filter.victoryPoints = true;
    filter.playableOnly = true;
    expect(matchesCardFilter(card, filter, context)).is.true;
    expect(matchesCardFilter(card, filter, {...context, playable: new Set()})).is.false;
    expect(matchesCardFilter({...card, calculatedCost: 8}, filter, context)).is.false;
    const options = cardFilterOptions([card], context);
    expect(options.highestCost).eq(7);
    expect(options.tags).deep.eq([{value: Tag.SPACE, count: 1}, {value: Tag.GALACTIC, count: 1}]);
    expect(options.victoryPoints).eq(1);
    expect(options.playable).eq(1);
  });

  it('combines options within a group with OR and different groups with AND', () => {
    const filter = emptyCardFilter();
    filter.tags.add(Tag.SPACE);
    filter.tags.add(Tag.ANIMAL);
    filter.types.add(CardType.ACTIVE);
    const context = {withCost: false};
    expect(matchesCardFilter({name: CardName.BIRDS}, filter, context)).is.true;
    expect(matchesCardFilter({name: CardName.ASTEROID}, filter, context)).is.false;
    expect(matchesCardFilter({name: CardName.HELION}, filter, context)).is.false;
  });
});
