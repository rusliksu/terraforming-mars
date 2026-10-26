import {expect} from 'chai';
import {GlobalEnergyInfrastructure} from '../../../src/server/cards/sillyfication/GlobalEnergyInfrastructure';
import {EnergySaving} from '../../../src/server/cards/base/EnergySaving';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('GlobalEnergyInfrastructure', () => {
  let card: GlobalEnergyInfrastructure;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GlobalEnergyInfrastructure();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires 2 power tags', () => {
    player.tagsForTest = {power: 1};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {power: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('raises energy production 3 steps on play', () => {
    card.play(player);
    expect(player.production.energy).to.eq(3);
  });

  it('gains 1 energy production when a power tag is played', () => {
    player.tagsForTest = {power: 4};
    player.production.override({energy: 0});

    card.onCardPlayed(player, new EnergySaving());

    expect(player.production.energy).to.eq(1);
  });

  it('does not trigger for a card without a power tag', () => {
    player.tagsForTest = {power: 4};
    player.production.override({energy: 0});

    card.onCardPlayed(player, new MicroCredits());

    expect(player.production.energy).to.eq(0);
  });

  it('does not scale with power tag count', () => {
    player.tagsForTest = {power: 8};
    player.production.override({energy: 0});

    card.onCardPlayed(player, new EnergySaving());

    expect(player.production.energy).to.eq(1);
  });
});
