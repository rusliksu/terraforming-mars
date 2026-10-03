import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectCard} from '../../inputs/SelectCard';
import {LogHelper} from '../../LogHelper';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {Size} from '../../../common/cards/render/Size';
import {CardRenderer} from '../render/CardRenderer';

export class Takeover extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.TAKEOVER,
      tags: [Tag.EARTH],
      cost: 35,

      metadata: {
        cardNumber: 'I60',
        renderData: CardRenderer.builder((b) => {
          b.corporation().asterix().nbsp.megacredits(-25, {size: Size.SMALL});
        }),
        description: 'Requires that it is generation 5 or later. Draw 5 corporation cards and choose 1 to play, ' +
          'keeping all its effects, actions, and starting M€ minus 25 (minimum 0), discarding the other 4.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    if (player.game.generation < 5) {
      return false;
    }
    if (!player.game.corporationDeck.canDraw(5)) {
      this.addWarning('deckTooSmall');
    }
    return true;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const corps = game.corporationDeck.drawN(game, 5);
    LogHelper.logDrawnCards(player, corps, true);

    player.defer(() => {
      return new SelectCard<ICorporationCard>('Choose a corporation card to play', 'Play', corps)
        .andThen(([card]) => {
          const reduction = Math.min(25, card.startingMegaCredits);
          player.playCorporationCard(card);
          player.stock.deduct(Resource.MEGACREDITS, reduction, {log: true});
          for (const corp of corps) {
            if (corp.name !== card.name) {
              game.corporationDeck.discard(corp);
            }
          }
          return undefined;
        });
    });
    return undefined;
  }
}
