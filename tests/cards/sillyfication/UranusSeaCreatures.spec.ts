import {expect} from 'chai';
import {UranusSeaCreatures} from '../../../src/server/cards/sillyfication/UranusSeaCreatures';
import {WaterImportFromEuropa} from '../../../src/server/cards/base/WaterImportFromEuropa';
import {GanymedeColony} from '../../../src/server/cards/base/GanymedeColony';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('UranusSeaCreatures', () => {
  let card: UranusSeaCreatures;
  let player: TestPlayer;

  let player2: TestPlayer;

  beforeEach(() => {
    card = new UranusSeaCreatures();
    [/* game */, player, player2] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires ANY 3 Jovian tags in play', () => {
    player.tagsForTest = {jovian: 2};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {jovian: 3};
    expect(card.canPlay(player)).is.true;
  });

  it('counts an opponent\'s Jovian tags towards the requirement', () => {
    player.tagsForTest = {jovian: 2};
    expect(card.canPlay(player)).is.false;

    player2.tagsForTest = {jovian: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('adds an animal per Jovian tag played, including by this player', () => {
    card.onCardPlayedByAnyPlayer(player, new GanymedeColony(), player); // 1 jovian tag
    expect(card.resourceCount).to.eq(1);

    card.onCardPlayedByAnyPlayer(player, new WaterImportFromEuropa(), player); // 1 jovian tag
    expect(card.resourceCount).to.eq(2);

    card.onCardPlayedByAnyPlayer(player, new MicroCredits(), player); // no jovian tag
    expect(card.resourceCount).to.eq(2);
  });

  it('adds an animal when any other player plays a Jovian tag', () => {
    card.onCardPlayedByAnyPlayer(player, new GanymedeColony(), player2); // 1 jovian tag
    expect(card.resourceCount).to.eq(1);
  });

  it('adds an animal when a Jovian tag is granted outside of playing a card (e.g. the Delta Project track)', () => {
    card.onNonCardTagAddedByAnyPlayer(player, Tag.JOVIAN);
    expect(card.resourceCount).to.eq(1);
  });

  it('does not react to a non-Jovian synthetic tag', () => {
    card.onNonCardTagAddedByAnyPlayer(player, Tag.SCIENCE);
    expect(card.resourceCount).to.eq(0);
  });

  it('scores 1 VP per animal', () => {
    player.addResourceTo(card, 5);
    expect(card.getVictoryPoints(player)).to.eq(5);
  });
});
