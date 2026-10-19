import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {Priority} from '../../deferredActions/Priority';

export class SpaceOffice extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SPACE_OFFICE,
      tags: [Tag.SPACE],
      cost: 25,
      resourceType: CardResource.FIGHTER,
      victoryPoints: 3,

      metadata: {
        cardNumber: 'T07',
        renderData: CardRenderer.builder((b) => {
          b.tag(Tag.SPACE).colon().resource(CardResource.FIGHTER).br;
          b.or().br;
          b.minus().resource(CardResource.FIGHTER, {amount: 2}).plus().cards(2);
        }),
        description: 'When you play a Space tag, including this, either add a fighter resource to this card, ' +
          'or remove 2 fighter resources from this card to draw 2 cards.',
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    const spaceTags = player.tags.cardTagCount(card, Tag.SPACE);
    this.onSpaceTagAdded(player, spaceTags);
  }

  public onNonCardTagAdded(player: IPlayer, tag: Tag) {
    if (tag === Tag.SPACE) {
      this.onSpaceTagAdded(player, 1);
    }
  }

  private onSpaceTagAdded(player: IPlayer, count: number) {
    for (let i = 0; i < count; i++) {
      player.defer(() => {
        if (this.resourceCount < 2) {
          player.addResourceTo(this, {log: true});
          return undefined;
        }
        return new OrOptions(
          new SelectOption('Remove 2 fighter resources from this card to draw 2 cards').andThen(() => {
            player.removeResourceFrom(this, 2, {log: false});
            player.game.log('${0} removed 2 resources from ${1} to draw 2 cards', (b) => b.player(player).card(this));
            player.drawCard(2);
            return undefined;
          }),
          new SelectOption('Add a fighter resource to this card').andThen(() => {
            player.addResourceTo(this, {log: true});
            return undefined;
          }),
        ).setTitle('Select an option for Space Office');
      }, Priority.OLYMPUS_CONFERENCE);
    }
    return undefined;
  }
}
