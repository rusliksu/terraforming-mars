import {expect} from 'chai';
import {VenusianBees} from '../../../src/server/cards/sillyfication/VenusianBees';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {setVenusScaleLevel} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('VenusianBees', () => {
  let card: VenusianBees;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new VenusianBees();
    [game, player] = testGame(2, {venusNextExtension: true});
    player.megaCredits = 20;
    setVenusScaleLevel(game, 14);
  });

  it('requires Venus 14%', () => {
    setVenusScaleLevel(game, 12);
    expect(card.canPlay(player)).is.false;
    setVenusScaleLevel(game, 14);
    expect(card.canPlay(player)).is.true;
  });

  it('raises plant production per microbe/plant pair', () => {
    player.tagsForTest = {microbe: 2, plant: 3};
    card.play(player);
    // 2 microbe + 1 (this) = 3; min(3, 3) = 3.
    expect(player.production.plants).to.eq(3);
  });

  it('counts its own microbe tag', () => {
    player.tagsForTest = {microbe: 0, plant: 2};
    card.play(player);
    // 0 + 1 (this) microbe pairs with 1 plant.
    expect(player.production.plants).to.eq(1);
  });

  it('gains nothing without a matching plant tag', () => {
    player.tagsForTest = {microbe: 4, plant: 0};
    card.play(player);
    expect(player.production.plants).to.eq(0);
  });

  it('assigns each wild tag to the side that is behind', () => {
    player.tagsForTest = {microbe: 2, plant: 1, wild: 2};
    card.play(player);
    // microbe = 2 + 1 (this) = 3, plant = 1; both wilds go to plant -> 3; min(3, 3) = 3.
    expect(player.production.plants).to.eq(3);
  });
});
