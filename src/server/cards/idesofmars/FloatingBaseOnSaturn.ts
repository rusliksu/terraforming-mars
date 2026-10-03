import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {ICard} from '../ICard';
import {CardName} from '../../../common/cards/CardName';
import {SelectCard} from '../../inputs/SelectCard';
import {CardRenderer} from '../render/CardRenderer';

export class FloatingBaseOnSaturn extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.FLOATING_BASE_ON_SATURN,
      tags: [Tag.JOVIAN],
      cost: 20,
      victoryPoints: 4,

      metadata: {
        cardNumber: 'I08',
        renderData: CardRenderer.builder((b) => {
          b.minus().resource(CardResource.FLOATER, {amount: 2, secondaryTag: Tag.JOVIAN});
        }),
        description: 'Remove up to 2 floaters from a Jovian card you own.',
      },
    });
  }

  private targets(player: IPlayer): ReadonlyArray<ICard> {
    return player.getCardsWithResources(CardResource.FLOATER).filter((card) => card.tags.includes(Tag.JOVIAN));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.targets(player).length > 0;
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    const targets = this.targets(player);
    return new SelectCard('Select a Jovian card to remove floaters from', 'Remove floaters', targets)
      .andThen(([card]) => {
        const count = Math.min(2, card.resourceCount);
        player.removeResourceFrom(card, count, {log: true});
        return undefined;
      });
  }
}
