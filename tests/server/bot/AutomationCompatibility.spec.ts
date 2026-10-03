import {expect} from 'chai';
import {FANMADE_MODULES, getAutomationCompatibility} from '../../../src/server/bot/AutomationCompatibility';
import {BotTakeoverManager} from '../../../src/server/bot/BotTakeoverManager';
import {DEFAULT_GAME_OPTIONS} from '../../../src/server/game/GameOptions';
import {CardName} from '../../../src/common/cards/CardName';
import {Server} from '../../../src/server/models/ServerModel';
import {testGame} from '../../TestGame';

describe('Automation compatibility', () => {
  it('retains legacy pool compatibility while rejecting unverified expanded pools', () => {
    const options = {...DEFAULT_GAME_OPTIONS, pathfindersExpansion: true};
    expect(getAutomationCompatibility(options).unsupportedFeatures).deep.eq([]);
    expect(getAutomationCompatibility(options, true).unsupportedFeatures).deep.eq(['pathfinders:fanmadeCards']);
    expect(getAutomationCompatibility({...options, includedCards: [CardName.DELTA_SURGE]}).unsupportedFeatures)
      .deep.eq(['deltaProject:fanmadeCards']);
  });

  it('covers every new module through both settings formats', () => {
    for (const module of FANMADE_MODULES) {
      expect(getAutomationCompatibility({...DEFAULT_GAME_OPTIONS,
        expansions: {...DEFAULT_GAME_OPTIONS.expansions, [module]: true}}).unsupportedFeatures).include(module);
      expect(getAutomationCompatibility({...DEFAULT_GAME_OPTIONS, [`${module}Expansion`]: true}).unsupportedFeatures).include(module);
    }
  });

  it('blocks spawning before resolving paths or opening log files', () => {
    const manager = new BotTakeoverManager({scriptPath: 'nonexistent'});
    expect(() => manager.start({gameId: 'g123', playerId: 'p123', serverId: 'test',
      compatibility: {version: 1, unsupportedFeatures: ['customBoard']}})).to.throw('not supported');
    expect(manager.list()).deep.eq([]);
  });

  it('exposes matching public metadata without private card names', () => {
    const [game, player] = testGame(2, {sillyficationExpansion: true});
    const compatibility = {version: 1, unsupportedFeatures: ['sillyfication']};
    expect(Server.getSimpleGameModel(game).automationCompatibility).deep.eq(compatibility);
    expect(Server.getPlayerModel(player).game.automationCompatibility).deep.eq(compatibility);
  });
});
