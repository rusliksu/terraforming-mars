import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {Resource, ALL_RESOURCES} from '../../../common/Resource';
import {SelectCard} from '../../inputs/SelectCard';
import {SelectOption} from '../../inputs/SelectOption';
import {OrOptions} from '../../inputs/OrOptions';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

/**
 * "COPY A (Copy a production cell on a card with a Space tag.)" There's no existing "copy a
 * production value from another card" mechanic in the codebase to reuse, so this is bespoke:
 * a SelectCard over the player's own Space-tagged tableau cards that grant *any* production
 * (reading each card's own static `behavior.production`, i.e. its printed production icons),
 * followed by a choice of which single resource-production line of that card to copy 1 step of.
 */
export class SpaceRobots extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SPACE_ROBOTS,
      tags: [Tag.SCIENCE],
      cost: 10,

      metadata: {
        cardNumber: 'H60',
        renderData: CardRenderer.builder((b) => {
          b.text('Copy a production box on a card with a Space tag.', {size: Size.SMALL, uppercase: true});
        }),
        description: 'Increase one of your production values 1 step, matching a production value printed on ' +
          'one of your cards with a Space tag.',
      },
    });
  }

  private productionAmount(card: ICard, resource: Resource): number {
    const value = card.behavior?.production?.[resource];
    return typeof value === 'number' ? value : 0;
  }

  private candidates(player: IPlayer): Array<ICard> {
    return player.tableau.filter((card) =>
      card !== this &&
      player.tags.cardHasTag(card, Tag.SPACE) &&
      ALL_RESOURCES.some((resource) => this.productionAmount(card, resource) > 0));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.candidates(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const candidates = this.candidates(player);
    if (candidates.length === 0) {
      return undefined;
    }
    return new SelectCard(
      'Select a card with a Space tag to copy 1 step of its production',
      'Select',
      candidates,
      {min: 1, max: 1})
      .andThen(([card]) => {
        this.copyProduction(player, card);
        return undefined;
      });
  }

  private copyProduction(player: IPlayer, card: ICard): void {
    const options = ALL_RESOURCES.filter((resource) => this.productionAmount(card, resource) > 0);
    if (options.length === 1) {
      player.production.add(options[0], 1, {log: true});
      return;
    }
    const orOptions = new OrOptions(...options.map((resource) =>
      new SelectOption(`Copy ${resource} production`, 'Select').andThen(() => {
        player.production.add(resource, 1, {log: true});
        return undefined;
      })));
    orOptions.title = 'Select which production line to copy';
    player.defer(orOptions);
  }
}
