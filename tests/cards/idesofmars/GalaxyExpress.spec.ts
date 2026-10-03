import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {GalaxyExpress} from '../../../src/server/cards/idesofmars/GalaxyExpress';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {IGame} from '../../../src/server/IGame';
import {IColony} from '../../../src/server/colonies/IColony';
import {TestPlayer} from '../../TestPlayer';

describe('GalaxyExpress', () => {
  let card: GalaxyExpress;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;
  let ganymede: IColony;
  let luna: IColony;

  beforeEach(() => {
    card = new GalaxyExpress();
    [game, player, player2] = testGame(2, {
      coloniesExtension: true,
      customColoniesList: [
        ColonyName.GANYMEDE,
        ColonyName.LUNA,
        ColonyName.PLUTO,
        ColonyName.TITAN,
        ColonyName.TRITON],
    });
    ganymede = game.colonies.find((c) => c.name === ColonyName.GANYMEDE)!;
    luna = game.colonies.find((c) => c.name === ColonyName.LUNA)!;
  });

  it('gains nothing when opponents own no colonies', () => {
    const mcBefore = player.megaCredits;
    card.play(player);
    expect(player.megaCredits).to.eq(mcBefore);
  });

  it('gains nothing for colonies the player owns themselves', () => {
    ganymede.colonies = [player.id];
    const mcBefore = player.megaCredits;
    card.play(player);
    expect(player.megaCredits).to.eq(mcBefore);
  });

  it('gains 1 M€ for each colony an opponent owns', () => {
    ganymede.colonies = [player2.id, player2.id];
    luna.colonies = [player2.id];
    const mcBefore = player.megaCredits;

    card.play(player);

    expect(player.megaCredits).to.eq(mcBefore + 3);
  });
});
