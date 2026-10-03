import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {Sideralis} from '../../../src/server/cards/solaris/Sideralis';
import {MoonExpansion} from '../../../src/server/moon/MoonExpansion';
import {PlaceMoonHabitatTile} from '../../../src/server/moon/PlaceMoonHabitatTile';

describe('Sideralis', () => {
  let card: Sideralis;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Sideralis();
    [game, player] = testGame(2, {moonExpansion: true});
    player.megaCredits = card.cost;
  });

  it('cannot play without an off-world City (a habitat tile)', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play once you own a habitat tile', () => {
    const moonData = MoonExpansion.moonData(game);
    const space = moonData.moon.getAvailableSpacesOnLand(player)[0];
    MoonExpansion.addHabitatTile(player, space.id);
    expect(card.canPlay(player)).is.true;
  });

  it('play increases production and places another habitat tile', () => {
    const moonData = MoonExpansion.moonData(game);
    const space = moonData.moon.getAvailableSpacesOnLand(player)[0];
    MoonExpansion.addHabitatTile(player, space.id);

    card.play(player);

    expect(player.production.titanium).to.eq(1);
    expect(player.production.megacredits).to.eq(4);
    expect(game.deferredActions.peek()).instanceOf(PlaceMoonHabitatTile);
  });

  it('victoryPoints counts every off-world City owned, including this one', () => {
    const moonData = MoonExpansion.moonData(game);
    const spaces = moonData.moon.getAvailableSpacesOnLand(player);
    expect(card.getVictoryPoints(player)).to.eq(0);

    MoonExpansion.addHabitatTile(player, spaces[0].id);
    expect(card.getVictoryPoints(player)).to.eq(1);

    MoonExpansion.addHabitatTile(player, spaces[1].id);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
