import {expect} from 'chai';
import {HeavyMachinery} from '../../../src/server/cards/robantilles/HeavyMachinery';
import {ImmigrantCity} from '../../../src/server/cards/base/ImmigrantCity';
import {CityStandardProject} from '../../../src/server/cards/base/standardProjects/CityStandardProject';
import {GreeneryStandardProject} from '../../../src/server/cards/base/standardProjects/GreeneryStandardProject';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Tag} from '../../../src/common/cards/Tag';
import {runAllActions} from '../../TestingUtils';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';
import {TileType} from '../../../src/common/TileType';

describe('HeavyMachinery', () => {
  let card: HeavyMachinery;
  let player: TestPlayer;

  beforeEach(() => {
    card = new HeavyMachinery();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires a building tag to play', () => {
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.not.true;
    player.tagsForTest = {[Tag.BUILDING]: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('discounts cards with a city tag', () => {
    expect(card.getCardDiscount(player, new ImmigrantCity())).to.eq(1);
  });

  it('discounts the City standard project', () => {
    expect(card.getStandardProjectDiscount(player, new CityStandardProject())).to.eq(1);
  });

  it('does not discount other standard projects', () => {
    expect(card.getStandardProjectDiscount(player, new GreeneryStandardProject())).to.eq(0);
  });

  it('discounts cards that declaratively place a special (non-city, non-ocean, non-greenery) tile', () => {
    // No shipped card currently places a tile via the top-level declarative `behavior.tile`
    // config (the few existing declarative tile placements, e.g. Luna Mining Hub, nest it under
    // `behavior.moon.tile` instead) -- this stub exercises the mechanism itself, which is ready
    // for any card (present or future) that does use it.
    const specialTileCard = {tags: [], behavior: {tile: {type: TileType.NUCLEAR_ZONE}}} as unknown as IProjectCard;
    expect(card.getCardDiscount(player, specialTileCard)).to.eq(1);
  });

  it('does not discount cards that declaratively place an ocean or greenery tile', () => {
    const oceanCard = {tags: [], behavior: {tile: {type: TileType.OCEAN}}} as unknown as IProjectCard;
    const greeneryCard = {tags: [], behavior: {tile: {type: TileType.GREENERY}}} as unknown as IProjectCard;
    expect(card.getCardDiscount(player, oceanCard)).to.eq(0);
    expect(card.getCardDiscount(player, greeneryCard)).to.eq(0);
  });

  it('action pays 11 M€ for 1 titanium production', () => {
    player.megaCredits = 11;
    card.action(player);
    runAllActions(player.game);
    expect(player.megaCredits).to.eq(0);
    expect(player.production.titanium).to.eq(1);
  });
});
