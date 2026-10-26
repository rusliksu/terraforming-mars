import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';
import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {ChooseCards} from '../../deferredActions/ChooseCards';
import {SilverCard} from './SilverCard';

/**
 * High Orbit (fan): Science Facility. Action: either
 *  - spend 1 energy AND 1 titanium to add 1 science resource to this card, or
 *  - spend 1 science resource here to look at the top 4 cards of the deck, keep 1, and discard
 *    the rest.
 *
 * The first branch spends two different resource types at once, which the declarative
 * `Behavior.spend` can't express (it only supports a single resource type per spend, see
 * Behavior.ts), so this is fully bespoke -- following the same "build an OrOptions array,
 * collapse to a direct call if only one branch is available" idiom as PercussiveReactor
 * and SpaceRobots.
 *
 * No VP on this card -- the source material shows an ambiguous icon but no confirming VP text.
 */
export class ScienceFacility extends SilverCard implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SCIENCE_FACILITY,
      cost: 3,
      resourceType: CardResource.SCIENCE,

      metadata: {
        cardNumber: 'HO08',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 energy and 1 titanium to add 1 science resource to this card.', (eb) => {
            eb.energy(1).nbsp.titanium(1).startAction.resource(CardResource.SCIENCE);
          }).br;
          b.action('Spend 1 science resource here to look at the top 4 cards of the deck, keep 1, and discard the rest.', (eb) => {
            eb.resource(CardResource.SCIENCE).startAction.cards(4);
          });
        }),
      },
    });
  }

  private canAddScience(player: IPlayer): boolean {
    return player.availableEnergy() >= 1 && player.titanium >= 1;
  }

  private canLookAtCards(player: IPlayer): boolean {
    return this.resourceCount >= 1 && player.game.projectDeck.canDraw(1);
  }

  public canAct(player: IPlayer): boolean {
    return this.canAddScience(player) || this.canLookAtCards(player);
  }

  public action(player: IPlayer) {
    const options: OrOptions = new OrOptions();

    if (this.canAddScience(player)) {
      options.options.push(new SelectOption('Spend 1 energy and 1 titanium to add 1 science resource to this card', 'Add science').andThen(() => {
        return player.spendEnergy(1, () => {
          player.stock.deduct(Resource.TITANIUM, 1, {log: true});
          player.addResourceTo(this, {qty: 1, log: true});
          return undefined;
        });
      }));
    }

    if (this.canLookAtCards(player)) {
      options.options.push(new SelectOption('Spend 1 science resource here to look at the top 4 cards of the deck', 'Look').andThen(() => {
        const game = player.game;
        player.removeResourceFrom(this, 1, {log: true});
        const cards = game.projectDeck.drawN(game, 4);
        game.defer(new ChooseCards(player, cards, {keepMax: 1}));
        return undefined;
      }));
    }

    if (options.options.length === 1) {
      return options.options[0].cb();
    }
    return options;
  }
}
