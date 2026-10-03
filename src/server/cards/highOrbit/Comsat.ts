import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {CardRenderer} from '../render/CardRenderer';
import {ICard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SilverCard} from './SilverCard';

/**
 * High Orbit (fan): Comsat. Passive effect -- whenever THIS player completes a trade action
 * (any kind: a standard colony trade, or a card-based trade action like Titan Floating Launch
 * Pad or Collegium Copernicus, all of which ultimately call `Colony.trade`), gain 1 M€.
 *
 * Hooks into the new `ICard.onTradeByAnyPlayer` callback, dispatched from `Colony.trade` --
 * see Colony.ts. There was no existing "a trade action was just performed" hook in the
 * codebase to reuse.
 */
export class Comsat extends SilverCard implements ICard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.COMSAT,
      cost: 1,

      metadata: {
        cardNumber: 'HO01',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you perform a trade action, gain 1 M€.', (eb) => {
            eb.trade().startEffect.megacredits(1);
          });
        }),
      },
    });
  }

  public onTradeByAnyPlayer(cardOwner: IPlayer, player: IPlayer) {
    if (cardOwner === player) {
      player.stock.add(Resource.MEGACREDITS, 1, {log: true, from: {card: this}});
    }
  }
}
