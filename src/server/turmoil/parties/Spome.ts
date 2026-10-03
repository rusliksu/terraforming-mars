import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Bonus} from '../Bonus';
import {IPolicy} from '../Policy';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {TileType, CITY_TILES} from '../../../common/TileType';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {BuildColony} from '../../deferredActions/BuildColony';
import {TITLES} from '../../inputs/titles';

const COLONY_COST = 15;

/**
 * More Parties: Spome, one of the 6 new "Political Agendas" parties. The source material
 * references "individual city track," "town tile," and "cloud city" -- concepts from the EPIC
 * campaign expansion this codebase doesn't model -- so bonus A drops the city-track/cloud-city
 * clauses (keeping only lunar habitats), policy 2 drops cloud city (keeping only lunar habitat
 * placement), and policy 4 (town tile) is left unimplemented, per the source document's own
 * guidance to ignore such references.
 */
export class Spome extends Party implements IParty {
  readonly name = PartyName.SPOME;
  readonly bonuses = [SPOME_BONUS_1, SPOME_BONUS_2];
  readonly policies = [SPOME_POLICY_1, SPOME_POLICY_2, SPOME_POLICY_3, SPOME_POLICY_4];
}

class SpomeBonus01 extends Bonus {
  readonly id = 'spob01' as const;
  readonly description = 'Gain 1 M€ for every lunar habitat tile you have';

  getScore(player: IPlayer) {
    const moon = player.game.moonData?.moon;
    if (moon === undefined) {
      return 0;
    }
    return moon.spaces.filter((space) => space.player === player && space.tile?.tileType === TileType.MOON_HABITAT).length;
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player), {log: true, from: {partyName: PartyName.SPOME}});
  }
}

class SpomeBonus02 extends Bonus {
  readonly id = 'spob02' as const;
  readonly description = 'Gain 1 M€ for every tile you own adjacent to a city and every colony you have';

  getScore(player: IPlayer) {
    const adjacentToCity = player.game.board.spaces.filter((space) =>
      space.player === player && space.tile !== undefined &&
      player.game.board.getAdjacentSpaces(space).some((adj) => adj.tile !== undefined && CITY_TILES.has(adj.tile.tileType)),
    ).length;
    const colonyCount = player.game.colonies.reduce(
      (sum, colony) => sum + colony.colonies.filter((id) => id === player.id).length, 0);
    return adjacentToCity + colonyCount;
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player), {log: true, from: {partyName: PartyName.SPOME}});
  }
}

// No behavior of its own -- its effect is applied directly by
// TurmoilHandler.applyOnCityTilePlacedEffect.
class SpomePolicy01 implements IPolicy {
  readonly id = 'spop01' as const;
  readonly description = 'Every time you place a city tile, draw 1 card';
}

// No behavior of its own -- its effect is applied directly by
// TurmoilHandler.applyOnHabitatTilePlacedEffect.
class SpomePolicy02 implements IPolicy {
  readonly id = 'spop02' as const;
  readonly description = 'Every time you place a lunar habitat tile, gain 4 M€';
}

class SpomePolicy03 implements IPolicy {
  readonly id = 'spop03' as const;
  readonly description = `Action: pay ${COLONY_COST} M€ (titanium usable) to place a colony`;

  canAct(player: IPlayer): boolean {
    return player.canAfford({cost: COLONY_COST, titanium: true}) &&
      player.colonies.getPlayableColonies().length > 0;
  }

  action(player: IPlayer) {
    const game = player.game;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.SPOME));
    game.defer(new SelectPaymentDeferred(player, COLONY_COST, {canUseTitanium: true, title: TITLES.payForPartyAction(PartyName.SPOME)}))
      .andThen(() => {
        game.defer(new BuildColony(player));
      });
    return undefined;
  }
}

// Not implemented: references "town tile" and the "individual city track," concepts from the
// EPIC campaign expansion that this codebase doesn't model.
class SpomePolicy04 implements IPolicy {
  readonly id = 'spop04' as const;
  readonly description = 'Not implemented in this codebase: pay 5 M€ to place a town tile on Mars; ' +
    'it advances your individual city track and is worth 1 VP (EPIC campaign concepts)';
}

export const SPOME_BONUS_1 = new SpomeBonus01();
export const SPOME_BONUS_2 = new SpomeBonus02();
export const SPOME_POLICY_1 = new SpomePolicy01();
export const SPOME_POLICY_2 = new SpomePolicy02();
export const SPOME_POLICY_3 = new SpomePolicy03();
export const SPOME_POLICY_4 = new SpomePolicy04();
