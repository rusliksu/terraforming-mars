import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {DrawCards} from '../../deferredActions/DrawCards';

const DATA_TO_DRAW = 2;

export class DataLibrary extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.DATA_LIBRARY,
      tags: [Tag.SCIENCE],
      cost: 3,

      resourceType: CardResource.DATA,

      action: {
        addResources: 1,
      },

      metadata: {
        cardNumber: 'H54',
        renderData: CardRenderer.builder((b) => {
          b.action('Add 1 data to this card.', (ab) => {
            ab.startAction.resource(CardResource.DATA);
          }).br;
          b.effect('When there are 2 data on this card, remove them to draw a card.', (eb) => {
            eb.resource(CardResource.DATA, {amount: 2}).startEffect.cards(1);
          });
        }),
      },
    });
  }

  // The action's own `addResources: 1` step (declared above) runs via a deferred action queued
  // by ActionCard.action() just before this is called -- it hasn't applied yet at this point.
  // So the auto-trigger check itself is deferred too, right behind it in the same queue (deferred
  // actions run FIFO within a priority), guaranteeing it sees the up-to-date resource count
  // immediately after the add resolves, rather than as a separate hook elsewhere.
  public override bespokeAction(player: IPlayer) {
    player.defer(() => {
      if (this.resourceCount >= DATA_TO_DRAW) {
        this.resourceCount -= DATA_TO_DRAW;
        player.game.log('${0} automatically removed 2 data from ${1} to draw a card', (b) => b.player(player).card(this));
        player.game.defer(DrawCards.keepAll(player, 1));
      }
      return undefined;
    });
    return undefined;
  }
}
