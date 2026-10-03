import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {Tag} from '../../../common/cards/Tag';
import {CardRenderer} from '../render/CardRenderer';
import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {TITLES} from '../../inputs/titles';
import {SilverCard} from './SilverCard';

/**
 * High Orbit (fan): Probe. Action: spend 1 M€ to reveal the top card of the deck; if it has a
 * Science tag, add 1 data resource to this card; either way, discard the revealed card.
 *
 * Nearly identical mechanic to the base game's Search For Life (spend 1 M€, reveal the top
 * card, check for a tag, conditionally add a card resource, then discard) --
 * src/server/cards/base/SearchForLife.ts -- reused here as the template, swapping the Microbe
 * tag for Science and the Science resource for Data.
 *
 * VP: 1 per data resource on this card (printed 1:1 ratio).
 */
export class Probe extends SilverCard implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PROBE,
      cost: 1,

      resourceType: CardResource.DATA,
      victoryPoints: {resourcesHere: {}},

      metadata: {
        cardNumber: 'HO09',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 M€ to reveal the top card of the draw deck. If that card has a Science tag, add 1 data resource here.', (eb) => {
            eb.megacredits(1).startAction.tag(Tag.SCIENCE).asterix().nbsp.colon().nbsp.resource(CardResource.DATA);
          }).br;
          b.vpText('1 VP per data resource on this card.');
        }),
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.canAfford(1) && player.game.projectDeck.canDraw(1);
  }

  public action(player: IPlayer) {
    player.game.defer(new SelectPaymentDeferred(player, 1, {title: TITLES.payForCardAction(this.name)}))
      .andThen(() => {
        const card = player.game.projectDeck.drawOrThrow(player.game);
        player.game.log('${0} revealed and discarded ${1}', (b) => b.player(player).card(card, {tags: true}));
        if (card.tags.includes(Tag.SCIENCE)) {
          player.addResourceTo(this, {qty: 1, log: true});
          player.game.log('${0} added a data resource to ${1}', (b) => b.player(player).card(this));
        }
        player.game.projectDeck.discard(card);
      });

    return undefined;
  }
}
