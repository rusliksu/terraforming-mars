import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {digit, uppercase} from '../Options';

export class LaunchWindow extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.LAUNCH_WINDOW,
      tags: [Tag.SPACE],
      cost: 11,

      metadata: {
        cardNumber: 'X33',
        renderData: CardRenderer.builder((b) => {
          b.text('next space card', {size: Size.SMALL, uppercase}).colon().megacredits(-16, {digit});
        }),
        description: 'The next card with a space tag you play this generation costs 16 M€ less.',
      },
    });
  }

  public override getCardDiscount(player: IPlayer, card: IProjectCard): number {
    return player.lastCardPlayed === this.name && card.tags.includes(Tag.SPACE) ? 16 : 0;
  }
}
