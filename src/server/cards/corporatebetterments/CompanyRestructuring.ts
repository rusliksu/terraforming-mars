import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {DiscardCards} from '../../deferredActions/DiscardCards';

export class CompanyRestructuring extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.COMPANY_RESTRUCTURING,
      tags: [Tag.EARTH],
      cost: 8,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'B38',
        renderData: CardRenderer.builder((b) => {
          b.effect('Discard any number of cards to gain 3 M€ each.', (eb) => {
            eb.cards(1).startEffect.megacredits(3);
          }).br;
          b.plainText('Opponents may discard cards the same way for 2 M€ each.');
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    game.defer(new DiscardCards(player, 0, player.cardsInHand.length, 'Select any number of cards to discard for 3 M€ each'))
      .andThen((discarded) => {
        if (discarded.length > 0) {
          player.stock.add(Resource.MEGACREDITS, discarded.length * 3, {log: true});
        }
        return undefined;
      });

    for (const opponent of player.opponents) {
      game.defer(new DiscardCards(opponent, 0, opponent.cardsInHand.length, 'Select any number of cards to discard for 2 M€ each'))
        .andThen((discarded) => {
          if (discarded.length > 0) {
            opponent.stock.add(Resource.MEGACREDITS, discarded.length * 2, {log: true});
          }
          return undefined;
        });
    }
    return undefined;
  }
}
