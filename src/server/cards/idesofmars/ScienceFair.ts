import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class ScienceFair extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.SCIENCE_FAIR,
      tags: [Tag.SCIENCE, Tag.BUILDING],
      cost: 3,

      metadata: {
        cardNumber: 'I04',
        renderData: CardRenderer.builder((b) => {
          b.cards(2).nbsp.plus().cards(1, {all});
        }),
        description: 'Draw 2 cards. Every other player draws 1 card.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.drawCard(2);
    for (const opponent of player.opponents) {
      opponent.drawCard(1);
    }
    return undefined;
  }
}
