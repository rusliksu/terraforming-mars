import {expect} from 'chai';
import {MartianCommercialSeafleet} from '../../../src/server/cards/robantilles/MartianCommercialSeafleet';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {addCity, addOcean, maxOutOceans} from '../../TestingUtils';

describe('MartianCommercialSeafleet', () => {
  let card: MartianCommercialSeafleet;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MartianCommercialSeafleet();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('cannot act without steel', () => {
    player.steel = 0;
    expect(card.canAct(player)).is.false;
  });

  it('can act with steel', () => {
    player.steel = 1;
    expect(card.canAct(player)).is.true;
  });

  it('pays nothing when no cities are ocean-connected', () => {
    addCity(player);
    player.steel = 1;
    const before = player.megaCredits;
    card.action(player);
    expect(player.megaCredits).to.eq(before);
    expect(player.steel).to.eq(0);
  });

  it('pays 2 M€ per city connected to another city via a chain of oceans', () => {
    const citySpace = game.board.getSpaceOrThrow('15');
    addCity(player, citySpace.id);
    const oceanSpace = game.board.getAdjacentSpaces(citySpace)[0];
    addOcean(player, oceanSpace.id);
    const secondCitySpace = game.board.getAdjacentSpaces(oceanSpace).find((space) => space.id !== citySpace.id);
    if (secondCitySpace === undefined) {
      throw new Error('test board layout assumption failed: no second city space available');
    }
    addCity(player, secondCitySpace.id);

    player.steel = 1;
    const before = player.megaCredits;
    card.action(player);
    // Both cities are connected to each other, so both count.
    expect(player.megaCredits - before).to.eq(4);
    expect(player.steel).to.eq(0);
  });

  it('requires 3 oceans to play', () => {
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.not.true;
    maxOutOceans(player, 3);
    expect(card.canPlay(player)).is.true;
  });
});
