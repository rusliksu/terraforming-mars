import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {IActionCard, ICard, isIActionCard, isIHasCheckLoops} from '../ICard';
import {SelectCard} from '../../inputs/SelectCard';

export class FamilyAdvertising extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.FAMILY_ADVERTISING,
      cost: 5,

      metadata: {
        cardNumber: 'B37',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Redo 2 used actions on 2 of your active cards.');
        }),
      },
    });
  }

  /* Cards with an action that has already been used this generation, and can be used again. */
  private getActionCards(player: IPlayer): Array<IActionCard & ICard> {
    const result: Array<IActionCard & ICard> = [];
    for (const playedCard of player.tableau) {
      if (playedCard === this) {
        continue;
      }
      if (!isIActionCard(playedCard)) {
        continue;
      }
      if (isIHasCheckLoops(playedCard) && playedCard.getCheckLoops() >= 2) {
        continue;
      }
      if (player.actionsThisGeneration.has(playedCard.name) && playedCard.canAct(player)) {
        result.push(playedCard);
      }
    }
    return result;
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.getActionCards(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const actionCards = this.getActionCards(player);
    const max = Math.min(2, actionCards.length);

    return new SelectCard<IActionCard & ICard>(
      'Select up to 2 played cards to use their action again',
      'Take actions',
      actionCards,
      {max, min: 1})
      .andThen((cards) => {
        for (const card of cards) {
          player.game.log('${0} used ${1} action again with ${2}', (b) => b.player(player).card(card).card(this));
          player.defer(() => card.action(player));
        }
        return undefined;
      });
  }
}
