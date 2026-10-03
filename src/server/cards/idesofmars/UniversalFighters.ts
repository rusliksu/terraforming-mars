import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {CardRenderer} from '../render/CardRenderer';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {RemoveResourcesFromCard} from '../../deferredActions/RemoveResourcesFromCard';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';

// The two resource types this card can shuttle around. Not a standard DSL case:
// `removeResourcesFromAnyCard` / `addResourcesToAnyCard` only support a single fixed
// resource type, but this card lets the player pick between two for both the source
// and the destination, so the action is implemented by hand below.
const TRANSFERABLE_RESOURCES: ReadonlyArray<CardResource> = [CardResource.FLOATER, CardResource.FIGHTER];

export class UniversalFighters extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.UNIVERSAL_FIGHTERS,
      tags: [Tag.VENUS, Tag.SPACE],
      cost: 8,

      resourceType: CardResource.FIGHTER,
      victoryPoints: {resourcesHere: {}, per: 2},

      behavior: {
        addResources: 2,
      },

      metadata: {
        cardNumber: 'Im68',
        renderData: CardRenderer.builder((b) => {
          b.action('Remove a floater or a fighter from anywhere to add a floater or a fighter to any card.', (eb) => {
            eb.resource(CardResource.FLOATER).slash().resource(CardResource.FIGHTER)
              .startAction.resource(CardResource.FLOATER).slash().resource(CardResource.FIGHTER);
          }).br;
          b.resource(CardResource.FIGHTER, 2).br;
          b.vpText('1 VP for every 2 fighters on this card.');
        }),
      },
    });
  }

  private removableTypes(player: IPlayer): ReadonlyArray<CardResource> {
    return TRANSFERABLE_RESOURCES.filter(
      (type) => RemoveResourcesFromCard.getAvailableTargetCards(player, type, 'all').length > 0);
  }

  public canAct(player: IPlayer): boolean {
    return this.removableTypes(player).length > 0;
  }

  private offerAddChoice(player: IPlayer): void {
    player.defer(new OrOptions(
      new SelectOption('Add 1 floater to any card', 'Select').andThen(() => {
        player.game.defer(new AddResourcesToCard(player, CardResource.FLOATER));
        return undefined;
      }),
      new SelectOption('Add 1 fighter to any card', 'Select').andThen(() => {
        player.game.defer(new AddResourcesToCard(player, CardResource.FIGHTER));
        return undefined;
      }),
    ));
  }

  private removeType(player: IPlayer, type: CardResource): void {
    player.game.defer(new RemoveResourcesFromCard(player, type, 1, {source: 'all'}))
      .andThen(() => {
        this.offerAddChoice(player);
        return undefined;
      });
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const types = this.removableTypes(player);

    if (types.length === 1) {
      this.removeType(player, types[0]);
      return undefined;
    }

    return new OrOptions(
      new SelectOption('Remove 1 floater from anywhere', 'Select').andThen(() => {
        this.removeType(player, CardResource.FLOATER);
        return undefined;
      }),
      new SelectOption('Remove 1 fighter from anywhere', 'Select').andThen(() => {
        this.removeType(player, CardResource.FIGHTER);
        return undefined;
      }),
    );
  }
}
