import {IPlayer} from '@/server/IPlayer';
import {Tag} from '@/common/cards/Tag';
import {CardResource} from '@/common/CardResource';
import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {AltSecondaryTag} from '@/common/cards/render/AltSecondaryTag';
import {hasFloaterIcon} from '@/server/cards/venusNext/floaterCards';
import {IActionCard, ICard} from '@/server/cards/ICard';
import {SelectCard} from '@/server/inputs/SelectCard';

export class CelesticRebalanced extends CorporationCard implements IActionCard {
  constructor() {
    super({
      name: CardName.CELESTIC_REBALANCED,
      tags: [Tag.VENUS],
      startingMegaCredits: 42,
      resourceType: CardResource.FLOATER,
      initialActionText: 'Draw 2 cards with a floater icon on it',
      victoryPoints: {resourcesHere: {}, per: 3},

      metadata: {
        cardNumber: 'R05',
        description: 'You start with 42 M€. As your first action, reveal cards from the deck until you have revealed 2 cards with a floater icon on it. Take them into hand and discard the rest.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(42).nbsp.cards(2, {secondaryTag: AltSecondaryTag.FLOATER});
          b.corpBox('action', (ce) => {
            ce.action('Add a floater each to 1 or 2 different cards. 1 VP per 3 floaters on this card.', (eb) => {
              eb.empty().startAction.resource(CardResource.FLOATER).asterix().resource(CardResource.FLOATER).asterix();
            });
            ce.br;
            ce.vSpace(); // to offset the description to the top a bit so it can be readable
          });
        }),
      },
    });
  }

  public canAct() {
    return true;
  }

  public action(player: IPlayer) {
    const cards = player.getResourceCards(CardResource.FLOATER);
    const add = (selected: ReadonlyArray<ICard>) => {
      for (const card of selected) {
        player.addResourceTo(card, {qty: 1, log: true});
      }
      return undefined;
    };
    if (cards.length <= 2) {
      return add(cards);
    }
    return new SelectCard('Select 2 different cards to add 1 floater each', 'Add floater', cards, {min: 2, max: 2}).andThen(add);
  }


  public override initialAction(player: IPlayer) {
    player.drawCard(2, {
      include: hasFloaterIcon,
    });
    return undefined;
  }
}
