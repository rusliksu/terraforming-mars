import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import {DEFAULT_EXPANSIONS, EXPANSIONS} from '@/common/cards/GameModule';
import {DEFAULT_GAME_OPTIONS} from '@/server/game/GameOptions';
import {Game} from '@/server/Game';
import {testGame} from '../../TestGame';
import reference from './reference.json';

describe('Rebalanced reference and options', () => {
  it('declares the active reference names as stable card IDs', () => {
    expect(reference.cards).has.length(113);
    expect(new Set(reference.cards.map((card) => card.name)).size).eq(113);
    expect(reference.cards.map((card) => Reflect.get(CardName, card.symbol)))
      .deep.eq(reference.cards.map((card) => card.name));
  });

  it('provides complete independent reference fields', () => {
    const types = ['automated', 'active', 'event', 'corporation', 'prelude', 'standard_project'];
    const tags = ['animal', 'building', 'city', 'earth', 'jovian', 'microbe', 'plant', 'power', 'science', 'space', 'venus', 'wild'];
    const missingTypes = reference.cards.filter((card) => !types.includes(card.type ?? '')).map((card) => card.symbol);
    expect(missingTypes, missingTypes.join(', ')).is.empty;
    for (const card of reference.cards) {
      if (['automated', 'active', 'event', 'standard_project'].includes(card.type ?? '')) {
        expect(card.cost, card.symbol).a('number').and.satisfy(Number.isInteger).and.at.least(0);
      }
      if (card.type === 'corporation') {
        expect(card.startingMegaCredits, card.symbol).a('number').and.satisfy(Number.isInteger).and.at.least(0);
      }
      expect(card.tags, card.symbol).an('array');
      expect(tags, card.symbol).include.members(card.tags);
      expect(card.texts, card.symbol).an('array');
      for (const text of card.texts) {
        expect(text, card.symbol).a('string').and.match(/\S/);
      }
    }
    expect(reference.cards.find((card) => card.symbol === 'INDUSTRIAL_CENTER_REBALANCED')).deep.include({
      type: 'active', cost: 4, tags: ['building'],
      texts: ['123', 'Spend 6 M€ to increase your steel production 1 step.', 'Place this tile adjacent to a city tile.'],
    });
    expect(reference.cards.find((card) => card.symbol === 'RESTRICTED_AREA_REBALANCED')).deep.include({
      type: 'active', cost: 13, tags: ['science'],
      texts: ['199', 'Spend 2 M€ to draw a card.', 'Place this tile.'],
    });
  });

  it('defaults Rebalanced off for new and legacy games', () => {
    expect(EXPANSIONS).includes('rebalanced');
    expect(Reflect.get(DEFAULT_EXPANSIONS, 'rebalanced')).eq(false);
    expect(Reflect.get(DEFAULT_GAME_OPTIONS, 'rebalancedExpansion')).eq(false);
    const [game] = testGame(1);
    const saved = JSON.parse(JSON.stringify(game.serialize()));
    delete saved.gameOptions.rebalancedExpansion;
    delete saved.gameOptions.expansions.rebalanced;
    const restored = Game.deserialize(saved, {viewOnly: true});
    expect(Reflect.get(restored.gameOptions, 'rebalancedExpansion')).eq(false);
  });

  it('preserves explicit opt-in through game creation and reload', () => {
    const options = {corporateEra: true, rebalancedExpansion: true};
    const [game] = testGame(1, options);
    expect(Reflect.get(game.gameOptions.expansions, 'rebalanced')).eq(true);
    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
    expect(Reflect.get(restored.gameOptions, 'rebalancedExpansion')).eq(true);
    expect(Reflect.get(restored.gameOptions.expansions, 'rebalanced')).eq(true);
  });
});
