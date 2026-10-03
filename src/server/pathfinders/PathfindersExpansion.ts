import {AddResourcesToCard} from '../deferredActions/AddResourcesToCard';
import {CardName} from '../../common/cards/CardName';
import {IGame} from '../IGame';
import {ICard} from '../cards/ICard';
import {PathfindersData, PlanetaryTag, isPlanetaryTag} from './PathfindersData';
import {PlaceCityTile} from '../deferredActions/PlaceCityTile';
import {PlaceGreeneryTile} from '../deferredActions/PlaceGreeneryTile';
import {PlaceMoonMineTile} from '../moon/PlaceMoonMineTile';
import {PlaceMoonRoadTile} from '../moon/PlaceMoonRoadTile';
import {PlaceOceanTile} from '../deferredActions/PlaceOceanTile';
import {PLANETARY_TRACKS} from '../../common/pathfinders/PlanetaryTracks';
import {IPlayer} from '../IPlayer';
import {Resource} from '../../common/Resource';
import {CardResource} from '../../common/CardResource';
import {Reward} from '../../common/pathfinders/Reward';
import {SelectResource} from '../inputs/SelectResource';
import {SendDelegateToArea} from '../deferredActions/SendDelegateToArea';
import {Tag} from '../../common/cards/Tag';
import {Turmoil} from '../turmoil/Turmoil';
import {VictoryPointsBreakdownBuilder} from '../game/VictoryPointsBreakdownBuilder';
import {GlobalEventName} from '../../common/turmoil/globalEvents/GlobalEventName';
import {Priority} from '../deferredActions/Priority';
import {message} from '../logs/MessageBuilder';
import {PlanetPr} from '../cards/pathfinders/PlanetPr';
import {PlanetPrII} from '../cards/pathfinders/PlanetPrII';

export class PathfindersExpansion {
  private constructor() {
  }

  public static initialize(game: IGame): PathfindersData {
    return {
      venus: game.tags.includes(Tag.VENUS) ? 0 : -1,
      earth: 0,
      mars: 0,
      jovian: 0,
      moon: game.tags.includes(Tag.MOON) ? 0 : -1,
      vps: [],
    };
  }

  public static onCardPlayed(player: IPlayer, card: ICard) {
    if (player.game.gameOptions.pathfindersExpansion === false) {
      return;
    }
    // Planet PR (BetterMars) and Planet PR II (plain Pathfinders) share this streak:
    // playing two cards with the same planetary tag back to back raises that track 1
    // additional step on the second one. Playing a card with no planetary tag at all
    // breaks the streak, even though it doesn't touch any track itself. A player could
    // hold both (e.g. via Merger), in which case they share one streak tracker.
    const planetPr = player.tableau.get(CardName.PLANET_PR) as PlanetPr | undefined;
    const planetPrII = player.tableau.get(CardName.PLANET_PR_II) as PlanetPrII | undefined;
    const streakCard = planetPr ?? planetPrII;
    const tags = card.tags;
    let hadPlanetaryTag = false;
    tags.forEach((tag) => {
      if (!isPlanetaryTag(tag)) {
        return;
      }
      hadPlanetaryTag = true;
      const steps = streakCard !== undefined && streakCard.lastPlanetaryTag === tag ? 2 : 1;
      PathfindersExpansion.raiseTrack(tag, player, steps);
      // Planet PR II's whole bonus is a flat 2 M€ when the streak itself triggers,
      // unlike Planet PR's per-track piggyback bonuses (see grantPlanetPrBonus).
      if (steps === 2 && planetPrII !== undefined) {
        player.stock.add(Resource.MEGACREDITS, 2, {log: true, from: {card: planetPrII}});
      }
      if (streakCard !== undefined) {
        streakCard.lastPlanetaryTag = tag;
      }
    });
    if (!hadPlanetaryTag && streakCard !== undefined) {
      streakCard.lastPlanetaryTag = undefined;
    }
  }

  public static willGainEnergyProductionOnNextMarsTag(player: IPlayer, count: 1 | 2 = 1): boolean {
    const data = player.game.pathfindersData;
    if (data === undefined) {
      return false;
    }
    const idx = data[Tag.MARS] + count;
    const rewards = PLANETARY_TRACKS[Tag.MARS].spaces[idx]?.risingPlayer;

    if (rewards === undefined) {
      return false;
    }
    if (rewards.includes('energy_production')) {
      return true;
    }
    if (count === 2) {
      return this.willGainEnergyProductionOnNextMarsTag(player, 1);
    }
    return false;
  }

  public static raiseTrack(tag: PlanetaryTag, player: IPlayer, steps: number = 1): void {
    PathfindersExpansion.raiseTrackEssense(tag, player, player.game, steps, true);
  }

  public static raiseTrackForGlobalEvent(tag: PlanetaryTag, name: GlobalEventName, game: IGame, steps: number = 1, gainRewards: boolean = true): void {
    PathfindersExpansion.raiseTrackEssense(tag, name, game, steps, gainRewards);
  }

  private static raiseTrackEssense(tag: PlanetaryTag, from: IPlayer | GlobalEventName, game: IGame, steps: number = 1, gainRewards: boolean = true): void {
    const data = game.pathfindersData;
    if (data === undefined) {
      return;
      // throw new Error('Pathfinders not defined');
    }

    const track = PLANETARY_TRACKS[tag];
    if (track === undefined) {
      return;
    }

    let space = data[tag];

    // Do not raise tracks unused this game.
    if (space === -1) {
      return;
    }

    const lastSpace = Math.min(track.spaces.length - 1, space + steps);
    const distance = lastSpace - space;
    if (distance === 0) {
      return;
    }

    if (typeof(from) === 'object') {
      game.log('${0} raised the ${1} planetary track ${2} step(s)', (b) => {
        b.player(from).string(tag).number(distance);
      });
    } else {
      game.log('Global Event ${0} raised the ${1} planetary track ${2} step(s)', (b) => {
        b.globalEventName(from).string(tag).number(distance);
      });
    }

    // game.indentation++;
    while (space < lastSpace) {
      space++;
      data[tag] = space;
      const rewards = track.spaces[space];

      // Can be false because of the Constant Struggle global event.
      if (gainRewards) {
        if (typeof(from) === 'object') {
          rewards.risingPlayer.forEach((reward) => {
            PathfindersExpansion.grant(reward, from, tag);
          });
          // Some spaces (e.g. Mars/Jovian space 2) only have an `everyone` reward and no
          // `risingPlayer` one - that still counts as "triggering the track's bonus" for
          // Planet PR, so check both instead of just risingPlayer.
          if (rewards.risingPlayer.length > 0 || rewards.everyone.length > 0) {
            PathfindersExpansion.grantPlanetPrBonus(from, tag);
          }
        }
      }
      rewards.everyone.forEach((reward) => {
        game.players.forEach((p) => {
          PathfindersExpansion.grant(reward, p, tag);
        });
      });
      if (rewards.mostTags.length > 0) {
        const players = PathfindersExpansion.playersWithMostTags(
          tag,
          game.players.slice(),
          (typeof(from) === 'object') ? from : undefined);
        rewards.mostTags.forEach((reward) => {
          players.forEach((p) => {
            PathfindersExpansion.grant(reward, p, tag);
          });
        });
      }
      // game.indentation--;
    }
  }

  /**
   * Grant the specified award.
   *
   * @param reward the reward to grant
   * @param player the player gaining the reward (which may not be the same as the player who triggers the reward)
   * @param tag the tag associated with the reward (used for logging VP rewards.)
   */
  public static grant(reward: Reward, player: IPlayer, tag: PlanetaryTag): void {
    const game = player.game;

    switch (reward) {
    case '1vp':
      game.pathfindersData?.vps.push({id: player.id, tag, points: 1});
      game.log('${0} has the most ${1} tags and earns 1VP', (b) => b.player(player).string(tag));
      break;
    case '2vp':
      game.pathfindersData?.vps.push({id: player.id, tag, points: 2});
      game.log('${0} has the most ${1} tags and earns 2VP', (b) => b.player(player).string(tag));
      break;
    case '3mc':
      player.stock.add(Resource.MEGACREDITS, 3, {log: true});
      break;
    case '6mc':
      player.stock.add(Resource.MEGACREDITS, 6, {log: true});
      break;
    //   break;
    case 'card':
      player.drawCard();
      break;
    case 'city':
      game.defer(new PlaceCityTile(player));
      break;
    case 'delegate':
      Turmoil.ifTurmoilElse(game,
        (turmoil) => {
          if (turmoil.hasDelegatesInReserve(player)) {
            game.defer(new SendDelegateToArea(player));
          }
        },
        () => player.stock.add(Resource.MEGACREDITS, 3, {log: true}));
      break;
    case 'energy':
      player.stock.add(Resource.ENERGY, 1, {log: true});
      break;
    case 'energy_production':
      player.production.add(Resource.ENERGY, 1, {log: true});
      break;
    case 'floater':
      game.defer(new AddResourcesToCard(player, CardResource.FLOATER));
      break;
    case 'greenery':
      game.defer(new PlaceGreeneryTile(player));
      break;
    case 'heat':
      player.stock.add(Resource.HEAT, 1, {log: true});
      break;
    case 'heat_production':
      player.production.add(Resource.HEAT, 1, {log: true});
      break;
    case 'moon_mine':
      game.defer(new PlaceMoonMineTile(player));
      break;
    case 'moon_road':
      game.defer(new PlaceMoonRoadTile(player));
      break;
    case 'ocean':
      game.defer(new PlaceOceanTile(player));
      break;
    case 'plant':
      player.stock.add(Resource.PLANTS, 1, {log: true});
      break;
    case 'plant_production':
      player.production.add(Resource.PLANTS, 1, {log: true});
      break;
    case 'any_resource':
    case 'resource':
      player.defer(new SelectResource(message('Gain ${0} units of a standard resource', (b) => b.number(1)))
        .andThen((unit) => {
          player.stock.add(unit, 1, {log: true});
          return undefined;
        }));
      break;
    case 'steel':
      player.stock.add(Resource.STEEL, 1, {log: true});
      break;
    case 'steel_production':
      player.production.add(Resource.STEEL, 1, {log: true});
      break;
    case 'titanium':
      player.stock.add(Resource.TITANIUM, 1, {log: true});
      break;
    case 'titanium_production':
      player.production.add(Resource.TITANIUM, 1, {log: true});
      break;
    case 'tr':
      player.increaseTerraformRating();
      break;
    case 'venus_scale':
      if (game.gameOptions.venusNextExtension) {
        game.increaseVenusScaleLevel(player, 1);
      } else {
        player.game.log('TODO: come up with some reward in place of Increase Venus Scale.');
      }
      break;
    default:
      throw new Error('Unknown reward: ' + reward);
    }
  }

  /** Planet PR: whenever you trigger a planetary track bonus, also gain a small track-specific reward. */
  private static grantPlanetPrBonus(player: IPlayer, tag: PlanetaryTag): void {
    if (!player.tableau.has(CardName.PLANET_PR)) {
      return;
    }
    switch (tag) {
    case Tag.VENUS:
      player.game.defer(new AddResourcesToCard(player, CardResource.FLOATER));
      break;
    case Tag.EARTH:
      player.stock.add(Resource.MEGACREDITS, 2, {log: true});
      break;
    case Tag.MARS:
    case Tag.MOON:
      player.stock.add(Resource.STEEL, 1, {log: true});
      break;
    case Tag.JOVIAN:
      player.stock.add(Resource.TITANIUM, 1, {log: true});
      break;
    }
  }

  private static playersWithMostTags(tag: Tag, players: Array<IPlayer>, activePlayer: IPlayer | undefined): Array<IPlayer> {
    const counts = players.map((player) => {
      // Wild tags only apply to a player taking an action.
      const includeWildTags = player.id === activePlayer?.id;
      const count = player.tags.count(tag, includeWildTags ? 'default' : 'raw');
      return {player, count};
    });
    const max = Math.max(...counts.map((c) => c.count));
    const filtered = counts.filter((c) => c.count === max);
    const result = filtered.map((c) => c.player);
    return result;
  }

  public static calculateVictoryPoints(player: IPlayer, builder: VictoryPointsBreakdownBuilder) {
    const data = player.game.pathfindersData;
    if (data === undefined) {
      return;
    }
    data.vps
      .filter((vp) => vp.id === player.id)
      .forEach((vp) => builder.setVictoryPoints('planetary tracks', vp.points, vp.tag));
  }

  public static addToSolBank(player: IPlayer) {
    const solBank = player.tableau.get(CardName.SOLBANK);
    if (solBank !== undefined) {
      player.defer(
        () => player.addResourceTo(solBank, {qty: 1, log: true}),
        Priority.GAIN_RESOURCE_OR_PRODUCTION);
    }
  }
}
