import {expect} from 'chai';
import {DataDrivenCard} from '../../src/server/cards/DataDrivenCard';
import {blankCustomCard} from '../../src/common/cards/CustomCardDefinition';
import {testGame} from '../TestGame';
import {cast} from '@/common/utils/utils';
import {CardType} from '../../src/common/cards/CardType';
import {Tag} from '../../src/common/cards/Tag';

describe('DataDrivenCard', () => {
  it('plays a stock-gain behavior via the shared Executor, exactly like a hand-authored card', () => {
    const def = blankCustomCard('Test Steel Card');
    def.behavior = {stock: {steel: 5}};
    const card = new DataDrivenCard(def);
    const [, player] = testGame(2);

    cast(card.play(player), undefined);
    expect(player.steel).to.eq(5);
  });

  it('plays a production-gain behavior', () => {
    const def = blankCustomCard('Test Production Card');
    def.behavior = {production: {megacredits: 2}};
    const card = new DataDrivenCard(def);
    const [, player] = testGame(2);

    cast(card.play(player), undefined);
    expect(player.production.megacredits).to.eq(2);
  });

  it('respects requirements via the same compiled requirement classes real cards use', () => {
    const def = blankCustomCard('Test Requirement Card');
    def.requirements = [{oceans: 9}]; // never satisfiable at game start
    const card = new DataDrivenCard(def);
    const [, player] = testGame(2);

    expect(card.canPlay(player)).is.false;
  });

  it('exposes cost/tags/type/victoryPoints exactly as defined', () => {
    const def = blankCustomCard('Test Full Card');
    def.type = CardType.ACTIVE;
    def.cost = 14;
    def.tags = [Tag.SCIENCE];
    def.victoryPoints = 2;
    const card = new DataDrivenCard(def);
    const [, player] = testGame(2);

    expect(card.cost).eq(14);
    expect(card.type).eq(CardType.ACTIVE);
    expect(card.tags).deep.eq([Tag.SCIENCE]);
    expect(card.getVictoryPoints(player)).eq(2);
  });

  it('carries the composed renderData/description straight through to metadata', () => {
    const def = blankCustomCard('Test Render Card');
    def.description = 'Does a thing.';
    const card = new DataDrivenCard(def);

    expect(card.metadata.description).eq('Does a thing.');
    expect(card.metadata.renderData).deep.eq(def.renderData);
  });
});
