import {expect} from 'chai';
import {MuseumOfTerraformation} from '../../../src/server/cards/idesofmars/MuseumOfTerraformation';
import {testGame} from '../../TestGame';
import {setTemperature, setOxygenLevel, setVenusScaleLevel, maxOutOceans} from '../../TestingUtils';
import {MAX_TEMPERATURE, MAX_OXYGEN_LEVEL, MAX_VENUS_SCALE} from '../../../src/common/constants';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';

describe('MuseumOfTerraformation', () => {
  let card: MuseumOfTerraformation;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MuseumOfTerraformation();
    [game, player] = testGame(2);
  });

  it('gains no TR when nothing is maxed', () => {
    const tr = player.terraformRating;
    card.bespokePlay(player);
    expect(player.terraformRating).to.eq(tr);
  });

  it('gains 1 TR for each maxed parameter (temperature, oxygen, oceans)', () => {
    setTemperature(game, MAX_TEMPERATURE);
    setOxygenLevel(game, MAX_OXYGEN_LEVEL);
    maxOutOceans(player);
    // Placing oceans grants its own TR bonus, so the baseline is captured after setup.
    const tr = player.terraformRating;

    card.bespokePlay(player);
    expect(player.terraformRating).to.eq(tr + 3);
  });

  it('also counts a maxed Venus scale when the Venus expansion is in play', () => {
    [game, player] = testGame(2, {venusNextExtension: true});
    const tr = player.terraformRating;
    setVenusScaleLevel(game, MAX_VENUS_SCALE);

    card.bespokePlay(player);
    expect(player.terraformRating).to.eq(tr + 1);
  });

  it('ignores a maxed Venus scale when the Venus expansion is not in play', () => {
    const tr = player.terraformRating;
    setVenusScaleLevel(game, MAX_VENUS_SCALE);

    card.bespokePlay(player);
    expect(player.terraformRating).to.eq(tr);
  });
});
