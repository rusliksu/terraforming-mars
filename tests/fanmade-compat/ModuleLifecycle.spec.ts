import {expect} from 'chai';
import {Game} from '../../src/server/Game';
import {Phase} from '../../src/common/Phase';
import {PartyName} from '../../src/common/turmoil/PartyName';
import {Payment} from '../../src/common/inputs/Payment';
import {cast} from '../../src/common/utils/utils';
import {blankCustomCard} from '../../src/common/cards/CustomCardDefinition';
import {TropicalResortBetterMars} from '../../src/server/cards/betterMars/TropicalResortBetterMars';
import {BiomassReactor} from '../../src/server/cards/corporatebetterments/BiomassReactor';
import {GasTurbines} from '../../src/server/cards/venusPhase2/GasTurbines';
import {DataDrivenCard} from '../../src/server/cards/DataDrivenCard';
import {SteelIndustryStandardProject} from '../../src/server/cards/industries/SteelIndustryStandardProject';
import {PowerPlant} from '../../src/server/cards/base/PowerPlant';
import {SelectSpace} from '../../src/server/inputs/SelectSpace';
import {Turmoil} from '../../src/server/turmoil/Turmoil';
import {testGame} from '../TestGame';
import {finishGeneration, forcePartiesInPlay, runAllActions, setVenusScaleLevel} from '../TestingUtils';

describe('Transferred module lifecycle', () => {
  for (const module of ['betterMars', 'customCards', 'corporateBetterments', 'venusPhase2'] as const) {
    it(`${module} keeps its played effect and score through production and reload`, () => {
      const [game, player] = testGame(2, {[`${module}Expansion`]: true, venusNextExtension: true});
      game.generation = 2;
      game.phase = Phase.ACTION;
      player.production.override({heat: 2});
      setVenusScaleLevel(game, 20);
      const custom = {...blankCustomCard('Lifecycle custom'), behavior: {production: {steel: 2}}, victoryPoints: 3};
      const card = module === 'betterMars' ? new TropicalResortBetterMars() :
        module === 'customCards' ? new DataDrivenCard(custom) :
          module === 'corporateBetterments' ? new BiomassReactor() : new GasTurbines();
      player.playCard(card);
      runAllActions(game);
      if (card instanceof BiomassReactor) {
        card.action(player);
      }
      const before = player.stock.asUnits();
      finishGeneration(game);
      expect(game.generation).eq(3);
      if (module === 'betterMars') {
        expect(player.megaCredits - before.megacredits).eq(player.terraformRating + 3);
      }
      if (module === 'customCards') {
        expect(player.steel - before.steel).eq(2);
      }
      if (module === 'corporateBetterments') {
        expect(player.energy).eq(3);
        expect(player.plants - before.plants).eq(1);
      }
      if (module === 'venusPhase2') {
        expect(player.energy).eq(2);
      }
      const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
      const restoredCard = restored.players[0].playedCards.get(card.name)!;
      expect(restoredCard.getVictoryPoints(restored.players[0])).eq({betterMars: 2, customCards: 3, corporateBetterments: 0, venusPhase2: 1}[module]);
    });
  }

  it('industry placement produces next generation without creating tile VP', () => {
    const [game, player] = testGame(2, {industriesExpansion: true});
    game.generation = 2;
    game.phase = Phase.ACTION;
    player.playedCards.push(new PowerPlant());
    player.megaCredits = 10;
    const beforeVP = player.getVictoryPoints().total;
    new SteelIndustryStandardProject().payAndExecute(player, Payment.of({megacredits: 10}));
    for (let i = 0; i < 3; i++) {
      runAllActions(game);
      const choice = cast(player.popWaitingFor(), SelectSpace);
      choice.cb(choice.spaces[0]);
    }
    runAllActions(game);
    expect(game.deferredActions.length).eq(0);
    expect(player.industryTilesPlaced).eq(1);
    const steel = player.steel;
    finishGeneration(game);
    expect(game.generation).eq(3);
    expect(player.steel).eq(steel + 1);
    expect(player.getVictoryPoints().total).eq(beforeVP);
    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
    expect(restored.players[0].industryTilesPlaced).eq(1);
  });

  it('new party leadership retains ordinary Turmoil end-game scoring after reload', () => {
    const restoreShuffle = forcePartiesInPlay(PartyName.BUREAUCRATS);
    try {
      const [game, player] = testGame(2, {morePartiesExpansion: true, turmoilExtension: true});
      const turmoil = Turmoil.getTurmoil(game);
      for (let i = 0; i < 3; i++) {
        turmoil.sendDelegateToParty(player, PartyName.BUREAUCRATS, game);
      }
      expect(turmoil.getPartyByName(PartyName.BUREAUCRATS).partyLeader).eq(player);
      turmoil.chairman = player;
      expect(turmoil.getVictoryPoints(player)).eq(2);
      const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
      expect(Turmoil.getTurmoil(restored).getVictoryPoints(restored.players[0])).eq(2);
    } finally {
      restoreShuffle();
    }
  });
});
