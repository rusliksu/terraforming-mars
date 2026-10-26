import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectCard} from '../../inputs/SelectCard';
import {CardRenderer} from '../render/CardRenderer';

export class MiningTheBelt extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MINING_THE_BELT,
      tags: [Tag.SPACE, Tag.BUILDING],
      cost: 3,

      metadata: {
        cardNumber: 'I59',
        renderData: CardRenderer.builder((b) => {
          b.minus().cards(1).br;
          b.tag(Tag.BUILDING).arrow().steel(1).br;
          b.tag(Tag.SPACE).arrow().titanium(1);
        }),
        description: 'Discard a card. If you discard a card with a building tag, increase your steel production 1 step. ' +
          'If you discard a card with a space tag, increase your titanium production 1 step.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    if (player.cardsInHand.length === 0) {
      return undefined;
    }
    return new SelectCard('Select a card to discard', 'Discard', player.cardsInHand)
      .andThen(([card]) => {
        player.discardCardFromHand(card, {log: true});
        if (card.tags.includes(Tag.BUILDING)) {
          player.production.add(Resource.STEEL, 1, {log: true});
        }
        if (card.tags.includes(Tag.SPACE)) {
          player.production.add(Resource.TITANIUM, 1, {log: true});
        }
        return undefined;
      });
  }
}
