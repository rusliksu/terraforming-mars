import {expect} from 'chai';
import {testGame} from '../TestGame';
import {IGame} from '../../src/server/IGame';
import {TestPlayer} from '../TestPlayer';
import {Phase} from '../../src/common/Phase';
import {runAllActions} from '../TestingUtils';
import {cast} from '../../src/common/utils/utils';
import {SelectSpace} from '../../src/server/inputs/SelectSpace';
import {GlobalParametersConfig} from '../../src/common/GlobalParameterConfig';
import {ConvertHeat} from '../../src/server/cards/base/standardActions/ConvertHeat';

function setTemperature(game: IGame, value: number) {
  (game as any).temperature = value;
}
function setOxygen(game: IGame, value: number) {
  (game as any).oxygenLevel = value;
}

describe('Global parameters', () => {
  describe('default configuration keeps the standard bumps', () => {
    let game: IGame;
    let player: TestPlayer;
    beforeEach(() => {
      [game, player] = testGame(2);
    });

    it('oxygen crossing 8 raises temperature', () => {
      setOxygen(game, 7);
      game.increaseOxygenLevel(player, 1);
      expect(game.getOxygenLevel()).eq(8);
      expect(game.getTemperature()).eq(-28);
    });

    it('temperature crossing -24 / -20 grants heat production', () => {
      setTemperature(game, -26);
      game.increaseTemperature(player, 2);
      expect(player.production.heat).eq(1);
      setTemperature(game, -22);
      game.increaseTemperature(player, 1);
      expect(player.production.heat).eq(2);
    });

    it('temperature crossing 0 places an ocean', () => {
      setTemperature(game, -2);
      game.increaseTemperature(player, 1);
      runAllActions(game);
      cast(player.popWaitingFor(), SelectSpace);
    });

    it('marsIsTerraformed uses the default maxima', () => {
      setTemperature(game, 8);
      setOxygen(game, 14);
      // oceans still 0
      expect(game.marsIsTerraformed()).is.false;
    });
  });

  describe('a stretched custom configuration', () => {
    const config: GlobalParametersConfig = {
      temperature: {min: -40, max: 20, step: 2, bonuses: [
        {value: 0, kind: 'ocean'},
        {value: 10, kind: 'heatProduction', amount: 2},
      ]},
      oxygen: {min: 0, max: 20, step: 1, bonuses: [
        {value: 12, kind: 'temperature'},
        {value: 6, kind: 'card', amount: 1},
      ]},
      venus: {min: 0, max: 30, step: 2, bonuses: [{value: 16, kind: 'tr', amount: 1}]},
      oceans: {max: 12},
      heatForTemperature: 6,
    };
    let game: IGame;
    let player: TestPlayer;
    beforeEach(() => {
      [game, player] = testGame(2, {globalParameters: config});
    });

    it('starts each track at the configured minimum', () => {
      expect(game.getTemperature()).eq(-40);
      expect(game.getOxygenLevel()).eq(0);
    });

    it('raises past the old max of 14 up to the configured 20', () => {
      setOxygen(game, 19);
      game.increaseOxygenLevel(player, 2);
      expect(game.getOxygenLevel()).eq(20);
    });

    it('fires a moved bump only on the crossed interval', () => {
      setTemperature(game, 6);
      game.increaseTemperature(player, 1); // 6 -> 8, does not reach 10
      expect(player.production.heat).eq(0);
      game.increaseTemperature(player, 1); // 8 -> 10, crosses
      expect(player.production.heat).eq(2);
      game.increaseTemperature(player, 1); // 10 -> 12, no re-trigger
      expect(player.production.heat).eq(2);
    });

    it('oxygen bump chains into the (stretched) temperature track at 12', () => {
      setOxygen(game, 11);
      game.increaseOxygenLevel(player, 1);
      expect(game.getTemperature()).eq(-38);
    });

    it('marsIsTerraformed needs the stretched maxima', () => {
      setTemperature(game, 8);
      setOxygen(game, 14);
      expect(game.marsIsTerraformed()).is.false;
      setTemperature(game, 20);
      setOxygen(game, 20);
      for (let i = 0; i < 12; i++) {
        game.addOcean(player, game.board.getAvailableSpacesForOcean(player)[0]);
        runAllActions(game);
      }
      expect(game.canAddOcean()).is.false;
      expect(game.marsIsTerraformed()).is.true;
    });

    it('Convert Heat spends the configured heat cost', () => {
      const action = new ConvertHeat();
      player.heat = 6;
      expect(action.canAct(player)).is.true;
      player.heat = 5;
      expect(action.canAct(player)).is.false;
    });

    it('solar phase still places the free ocean but withholds player rewards', () => {
      game.phase = Phase.SOLAR;
      setTemperature(game, 8);
      game.increaseTemperature(player, 2); // crosses 10 (heatProduction) -- suppressed in solar
      expect(player.production.heat).eq(0);
    });
  });
});
