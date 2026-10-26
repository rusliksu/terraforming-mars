import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {keep, LogType} from '../../deferredActions/ChooseCards';
import {CardRenderer} from '../render/CardRenderer';

const BUY_COST = 3;

export class Copyleft extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.COPYLEFT,
      tags: [Tag.SCIENCE],
      cost: 5,

      metadata: {
        cardNumber: 'Im115',
        renderData: CardRenderer.builder((b) => {
          b.effect('When any Science tag is played, reveal 1 card.', (eb) => {
            eb.tag(Tag.SCIENCE).startEffect.cards(1);
          });
        }),
        description: `The player who played it may buy the revealed card for ${BUY_COST} M€; ` +
          `if they don't, you may buy it for ${BUY_COST} M€.`,
      },
    });
  }

  private discard(player: IPlayer, revealed: IProjectCard) {
    player.game.projectDeck.discard(revealed);
    player.game.log('${0} was discarded', (b) => b.card(revealed));
  }

  private offerToBuy(buyer: IPlayer, revealed: IProjectCard, onDecline: () => void) {
    if (!buyer.canAfford(BUY_COST)) {
      onDecline();
      return;
    }
    buyer.defer(new OrOptions(
      new SelectOption(`Buy ${revealed.name} for ${BUY_COST} M€`, 'Buy').andThen(() => {
        buyer.stock.deduct(Resource.MEGACREDITS, BUY_COST, {log: true});
        keep(buyer, [revealed], [], LogType.BOUGHT_VERBOSE);
        return undefined;
      }),
      new SelectOption('Pass', 'Pass').andThen(() => {
        onDecline();
        return undefined;
      }),
    ));
  }

  public onCardPlayedByAnyPlayer(cardOwner: IPlayer, card: ICard, activePlayer: IPlayer) {
    if (!activePlayer.tags.cardHasTag(card, Tag.SCIENCE)) {
      return undefined;
    }

    const game = cardOwner.game;
    const revealed = game.projectDeck.draw(game);
    if (revealed === undefined) {
      return undefined;
    }
    game.log('${0} revealed ${1} because of ${2}', (b) => b.player(cardOwner).card(revealed).card(this));

    this.offerToBuy(activePlayer, revealed, () => {
      if (cardOwner === activePlayer) {
        this.discard(cardOwner, revealed);
        return;
      }
      this.offerToBuy(cardOwner, revealed, () => this.discard(cardOwner, revealed));
    });
    return undefined;
  }
}
