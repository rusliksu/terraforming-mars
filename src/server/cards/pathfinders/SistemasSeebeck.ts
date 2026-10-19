import {Tag} from '../../../common/cards/Tag';
import {CorporationCard} from '../corporation/CorporationCard';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Behavior} from '../../behavior/Behavior';
import {Size} from '../../../common/cards/render/Size';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectAmount} from '../../inputs/SelectAmount';
import {Priority} from '../../deferredActions/Priority';
import {keep, LogType} from '../../deferredActions/ChooseCards';
import {Deck} from '../Deck';
import {IProjectCard} from '../IProjectCard';

/** Whether a single declarative behavior block spends energy, or cuts energy production
 * (e.g. Hackers' "-1 energy production", or most City-tile cards). Growing energy
 * production doesn't count - only losing it, one way or another, does. */
function usesEnergy(behavior: Behavior | undefined): boolean {
  if (behavior === undefined) {
    return false;
  }
  const energyProduction = behavior.production?.energy;
  return behavior.spend?.energy !== undefined || (typeof energyProduction === 'number' && energyProduction < 0);
}

/** Whether a card spends or reduces energy, either on play (`behavior`) or as its
 * repeatable action (`actionBehavior`) - used by Sistemas Seebeck's initial draw filter.
 * Heat doesn't count either way - starting cards should actually use the energy this corp
 * gives you, and heat production takes a few generations to show up anyway. */
function cardUsesEnergy(card: {behavior?: Behavior, actionBehavior?: Behavior}): boolean {
  return usesEnergy(card.behavior) || usesEnergy(card.actionBehavior);
}

export class SistemasSeebeck extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.SISTEMAS_SEEBECK,
      tags: [Tag.SCIENCE, Tag.POWER],
      startingMegaCredits: 45,
      initialActionText: 'Draw cards until you draw 2 cards that spend or reduce energy, then shuffle the rest back into the deck',

      metadata: {
        cardNumber: 'PfC97', // Renumber
        description: 'You start with 45 M€. Draw cards until you draw 2 cards that spend or reduce energy, then shuffle the rest back into the deck.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(45).br;
          b.text('2X', {size: Size.SMALL}).cards(1).colon().minus().energy(1, {size: Size.SMALL});
          b.corpBox('effect', (ce) => {
            ce.effect('You can use energy and heat (and production of energy and heat) interchangeably as one resource.', (eb) => {
              eb.energy(1, {size: Size.SMALL}).startEffect.heat(1, {size: Size.SMALL});
            });
          });
        }),
      },
    });
  }

  /** Unlike the generic "draw until you find N matches" mechanism most cards use (which
   * discards non-matches - the standard, correct behavior for that class of effect), this
   * one specifically shuffles its rejects back into the deck instead - by request, not a
   * shared mechanic change. */
  public override initialAction(player: IPlayer): PlayerInput | undefined {
    player.defer(() => {
      const game = player.game;
      const deck = game.projectDeck;
      const matched: Array<IProjectCard> = [];
      const rejected: Array<IProjectCard> = [];

      while (matched.length < 2) {
        if (matched.length + rejected.length >= deck.drawPile.length + deck.discardPile.length) {
          game.log('${0} went through the entire deck without finding 2 matches', (b) => b.player(player));
          break;
        }
        const card = deck.drawOrThrow(game);
        if (cardUsesEnergy(card)) {
          matched.push(card);
        } else {
          rejected.push(card);
        }
      }

      if (rejected.length > 0) {
        deck.drawPile.push(...rejected);
        Deck.shuffle(deck.drawPile, game.rng);
        game.log('${0} shuffled ${1} card(s) back into the deck', (b) => b.player(player).number(rejected.length));
      }

      keep(player, matched, [], LogType.DREW_VERBOSE);
      return undefined;
    }, Priority.DRAW_CARDS);
    return undefined;
  }

  /** A free conversion (energy<->heat, stock and production) offered directly in
   * Player.getActions() alongside Convert Plants/Convert Heat - unlike those, using it
   * does not consume one of the player's actions for the turn (see
   * Player.skipNextActionIncrement). Returns undefined if the player doesn't have this
   * corporation, or has nothing convertible right now. */
  public static buildFreeConvertAction(player: IPlayer): PlayerInput | undefined {
    if (!player.tableau.has(CardName.SISTEMAS_SEEBECK)) {
      return undefined;
    }

    const options: Array<SelectOption> = [];

    const addStockOption = (from: typeof Resource.ENERGY | typeof Resource.HEAT, to: typeof Resource.ENERGY | typeof Resource.HEAT) => {
      const available = player.stock.get(from);
      if (available <= 0) {
        return;
      }
      options.push(new SelectOption(`Convert ${from} to ${to}`, 'Convert').andThen(() => {
        return new SelectAmount(`Select amount of ${from} to convert to ${to}`, 'Convert', 1, available)
          .andThen((amount) => {
            player.stock.deduct(from, amount);
            player.stock.add(to, amount, {log: true});
            player.skipNextActionIncrement = true;
            return undefined;
          });
      }));
    };

    const addProductionOption = (from: typeof Resource.ENERGY | typeof Resource.HEAT, to: typeof Resource.ENERGY | typeof Resource.HEAT) => {
      const available = player.production.get(from);
      if (available <= 0) {
        return;
      }
      options.push(new SelectOption(`Convert ${from} production to ${to} production`, 'Convert').andThen(() => {
        return new SelectAmount(`Select amount of ${from} production to convert to ${to} production`, 'Convert', 1, available)
          .andThen((amount) => {
            player.production.add(from, -amount, {log: true, skipSeebeckRedistribution: true});
            player.production.add(to, amount, {log: true});
            player.skipNextActionIncrement = true;
            return undefined;
          });
      }));
    };

    addStockOption(Resource.HEAT, Resource.ENERGY);
    addStockOption(Resource.ENERGY, Resource.HEAT);
    addProductionOption(Resource.HEAT, Resource.ENERGY);
    addProductionOption(Resource.ENERGY, Resource.HEAT);

    if (options.length === 0) {
      return undefined;
    }
    return new OrOptions(...options).setTitle('Sistemas Seebeck: convert energy/heat (does not use your action)');
  }
}
