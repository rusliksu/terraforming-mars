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

  it('rejects Rebalanced explicitly through both settings formats', () => {
    expect(getAutomationCompatibility({...DEFAULT_GAME_OPTIONS, rebalancedExpansion: true}).unsupportedFeatures)
      .deep.eq(['rebalanced']);
    expect(getAutomationCompatibility({...DEFAULT_GAME_OPTIONS,
      expansions: {...DEFAULT_GAME_OPTIONS.expansions, rebalanced: true}}).unsupportedFeatures)
      .deep.eq(['rebalanced']);
  });

  it('rejects a manually included Rebalanced card when its module is disabled', () => {
    expect(getAutomationCompatibility({...DEFAULT_GAME_OPTIONS,
      includedCards: [CardName.ADAPTED_LICHEN_REBALANCED]}).unsupportedFeatures).deep.eq(['rebalanced']);
  });

  it('blocks the real takeover with computed Rebalanced compatibility before side effects', () => {
    let spawned = false;
    const manager = new BotTakeoverManager({scriptPath: 'wp09-nonexistent-bot-script',
      spawnProcess: () => {
        spawned = true;
        throw new Error('Unexpected bot process');
      }});
    const compatibility = getAutomationCompatibility({...DEFAULT_GAME_OPTIONS, rebalancedExpansion: true});
    expect(() => manager.start({gameId: 'g123', playerId: 'p123', serverId: 'test', compatibility}))
      .to.throw('Automatic play is not supported for these features: rebalanced');
    expect(spawned).is.false;
    expect(manager.list()).deep.eq([]);
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
