import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Bonus} from '../Bonus';
import {IPolicy} from '../Policy';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../../cards/ICard';
import {Tag} from '../../../common/cards/Tag';
import {TileType} from '../../../common/TileType';
import {Resource, ALL_RESOURCES} from '../../../common/Resource';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {message} from '../../logs/MessageBuilder';
import {ChooseTagPolicy} from './ChooseTagPolicy';
import {POLITICAL_AGENDAS_MAX_ACTION_USES} from '../../../common/constants';

const NON_MEGACREDIT_RESOURCES = ALL_RESOURCES.filter((r) => r !== Resource.MEGACREDITS);

function playerDistinctTags(player: IPlayer): Set<Tag> {
  const tags = new Set<Tag>();
  for (const card of player.tableau) {
    for (const tag of card.tags) {
      if (tag !== Tag.WILD) {
        tags.add(tag);
      }
    }
  }
  return tags;
}

export class Centrists extends Party implements IParty {
  readonly name = PartyName.CENTRISTS;
  readonly bonuses = [CENTRISTS_BONUS_1, CENTRISTS_BONUS_2];
  readonly policies = [CENTRISTS_POLICY_1, CENTRISTS_POLICY_2, CENTRISTS_POLICY_3, CENTRISTS_POLICY_4];
}

class CentristsBonus01 extends Bonus {
  readonly id = 'cenb01' as const;
  readonly description = 'Gain 1 M€ for every different tag you have';

  getScore(player: IPlayer) {
    return player.tags.distinctCount('default');
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player), {log: true, from: {partyName: PartyName.CENTRISTS}});
  }
}

class CentristsBonus02 extends Bonus {
  readonly id = 'cenb02' as const;
  readonly description = 'Gain 2 M€ for every kind of tile you have';

  getScore(player: IPlayer) {
    const tileTypes = new Set<TileType>();
    for (const space of player.game.board.spaces) {
      if (space.player === player && space.tile !== undefined) {
        tileTypes.add(space.tile.tileType);
      }
    }
    return tileTypes.size;
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player) * 2, {log: true, from: {partyName: PartyName.CENTRISTS}});
  }
}

class CentristsPolicy01 implements IPolicy {
  readonly id = 'cenp01' as const;
  readonly description = 'Action: pay 1 of each standard resource except M€, gain 15 M€ (max 3 times per generation)';

  canAct(player: IPlayer): boolean {
    return player.politicalAgendasActionUsedCount < POLITICAL_AGENDAS_MAX_ACTION_USES &&
      NON_MEGACREDIT_RESOURCES.every((resource) => player.stock[resource] >= 1);
  }

  action(player: IPlayer) {
    const game = player.game;
    player.politicalAgendasActionUsedCount += 1;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.CENTRISTS));
    for (const resource of NON_MEGACREDIT_RESOURCES) {
      player.stock.deduct(resource, 1, {log: true});
    }
    player.stock.add(Resource.MEGACREDITS, 15, {log: true, from: {partyName: PartyName.CENTRISTS}});
    return undefined;
  }
}

class CentristsPolicy02 implements IPolicy {
  readonly id = 'cenp02' as const;
  readonly description = 'Action: pay 7 M€ to raise one of your lowest productions 1 step (max 3 times per generation)';

  private lowestProductions(player: IPlayer): ReadonlyArray<Resource> {
    const min = Math.min(...ALL_RESOURCES.map((resource) => player.production[resource]));
    return ALL_RESOURCES.filter((resource) => player.production[resource] === min);
  }

  canAct(player: IPlayer): boolean {
    return player.canAfford(7) && player.politicalAgendasActionUsedCount < POLITICAL_AGENDAS_MAX_ACTION_USES;
  }

  action(player: IPlayer): PlayerInput | undefined {
    const game = player.game;
    const raise = (resource: Resource) => {
      player.politicalAgendasActionUsedCount += 1;
      game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.CENTRISTS));
      player.stock.deduct(Resource.MEGACREDITS, 7);
      player.production.add(resource, 1, {log: true});
      return undefined;
    };

    const candidates = this.lowestProductions(player);
    if (candidates.length === 1) {
      return raise(candidates[0]);
    }
    return new OrOptions(...candidates.map((resource) =>
      new SelectOption(message('Raise ${0} production', (b) => b.string(resource))).andThen(() => raise(resource))));
  }
}

class CentristsPolicy03 implements IPolicy {
  readonly id = 'cenp03' as const;
  readonly description = 'Every time you play a card with a tag you did not have, gain 4 M€';

  onCardPlayed(player: IPlayer, card: ICard) {
    const priorTags = new Set<Tag>();
    for (const c of player.tableau) {
      if (c === card) {
        continue;
      }
      for (const tag of c.tags) {
        if (tag !== Tag.WILD) {
          priorTags.add(tag);
        }
      }
    }
    const hasNewTag = card.tags.some((tag) => tag !== Tag.WILD && !priorTags.has(tag));
    if (hasNewTag) {
      player.stock.add(Resource.MEGACREDITS, 4, {log: true, from: {partyName: PartyName.CENTRISTS}});
    }
  }
}

export const CENTRISTS_BONUS_1 = new CentristsBonus01();
export const CENTRISTS_BONUS_2 = new CentristsBonus02();
export const CENTRISTS_POLICY_1 = new CentristsPolicy01();
export const CENTRISTS_POLICY_2 = new CentristsPolicy02();
export const CENTRISTS_POLICY_3 = new CentristsPolicy03();
export const CENTRISTS_POLICY_4 = new ChooseTagPolicy(
  'cenp04', PartyName.CENTRISTS, 'a tag you do not have', (player) => {
    const owned = playerDistinctTags(player);
    return player.game.tags.filter((tag) => tag !== Tag.WILD && tag !== Tag.EVENT && !owned.has(tag));
  });
