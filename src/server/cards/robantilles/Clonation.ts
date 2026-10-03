import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class Clonation extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.CLONATION,
      tags: [Tag.SCIENCE, Tag.ANIMAL],
      cost: 10,

      requirements: {party: PartyName.SCIENTISTS},

      metadata: {
        cardNumber: 'H40',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.ANIMAL, {all}).plus().resource(CardResource.ANIMAL).asterix();
        }),
        description: 'Requires that the Scientists are ruling or that you have 2 delegates there. ' +
          'Add 1 Animal to every card you own that already has at least 1 Animal on it.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    for (const card of player.getCardsWithResources(CardResource.ANIMAL)) {
      player.addResourceTo(card, {qty: 1, log: true});
    }
    return undefined;
  }
}
