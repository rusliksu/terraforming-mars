import {expect} from 'chai';
import {AlienReactorAtivation} from '../../../src/server/cards/robantilles/AlienReactorAtivation';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {setTemperature, setOxygenLevel} from '../../TestingUtils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';
import {MAX_TEMPERATURE, MAX_OXYGEN_LEVEL} from '../../../src/common/constants';

describe('AlienReactorAtivation', () => {
  let card: AlienReactorAtivation;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new AlienReactorAtivation();
    [game, player] = testGame(1);
  });

  it('cannot play when both temperature and oxygen are maxed', () => {
    setTemperature(game, MAX_TEMPERATURE);
    setOxygenLevel(game, MAX_OXYGEN_LEVEL);
    expect(card.canPlay(player)).is.false;
  });

  it('offers a choice between temperature and oxygen when both can be raised', () => {
    const startingTemp = game.getTemperature();
    const startingTr = player.terraformRating;

    const orOptions = cast(card.play(player), OrOptions);
    expect(orOptions.options).has.lengthOf(2);

    orOptions.options[0].cb(undefined);
    expect(game.getTemperature()).to.eq(startingTemp + 2);
    // +1 TR from raising the global parameter automatically, +1 TR from the card's own bonus.
    expect(player.terraformRating).to.eq(startingTr + 2);
  });

  it('raising oxygen instead also grants the extra TR on top of the automatic gain', () => {
    const startingOxygen = game.getOxygenLevel();
    const startingTr = player.terraformRating;

    const orOptions = cast(card.play(player), OrOptions);
    orOptions.options[1].cb(undefined);

    expect(game.getOxygenLevel()).to.eq(startingOxygen + 1);
    expect(player.terraformRating).to.eq(startingTr + 2);
  });

  it('automatically raises oxygen (with the bonus TR) when temperature is already maxed', () => {
    setTemperature(game, MAX_TEMPERATURE);
    const startingOxygen = game.getOxygenLevel();
    const startingTr = player.terraformRating;

    expect(card.play(player)).is.undefined;
    expect(game.getOxygenLevel()).to.eq(startingOxygen + 1);
    expect(player.terraformRating).to.eq(startingTr + 2);
  });

  it('automatically raises temperature (with the bonus TR) when oxygen is already maxed', () => {
    setOxygenLevel(game, MAX_OXYGEN_LEVEL);
    const startingTemp = game.getTemperature();
    const startingTr = player.terraformRating;

    expect(card.play(player)).is.undefined;
    expect(game.getTemperature()).to.eq(startingTemp + 2);
    expect(player.terraformRating).to.eq(startingTr + 2);
  });
});
