import {IProjectCard} from '../IProjectCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {SilverActionCard} from './SilverActionCard';

export class PropellantDepot extends SilverActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PROPELLANT_DEPOT,
      cost: 2,

      resourceType: CardResource.ORE,

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {
              title: 'Spend 1 energy to add 1 ore to any of your ore-capable cards',
              spend: {energy: 1},
              addResourcesToAnyCard: {type: CardResource.ORE, count: 1},
            },
            // Interpretation note: the printed card lets ore stored HERE be spent as 2 M€
            // "toward the cost of playing" a Venus/Moon/Jovian-tagged card specifically. The
            // engine's cost-discount hook (Card.getCardDiscount) fires on every cost
            // computation, not just an actual purchase, so it can't safely consume a finite
            // resource as a side effect -- and there's no existing "alternate currency scoped to
            // one card, gated by the tag of whatever's being bought" payment hook to build on.
            // The simplest faithful version (matching the task's suggested fallback) is a plain
            // conversion action: spend ore here for M€ outright, which a player would naturally
            // use right before affording such a card anyway, since M€ is fungible.
            {
              title: 'Spend 1 ore from this card to gain 2 M€',
              spend: {resourcesHere: 1},
              stock: {megacredits: 2},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'HO04',
        renderData: CardRenderer.builder((b) => {
          b.energy(1).arrow().resource(CardResource.ORE).nbsp.or().br;
          b.resource(CardResource.ORE, 1).arrow().megacredits(2).br;
          b.plainText(
            'Action: Spend 1 energy to add 1 ore to any card that can hold ore. Ore on THIS card can be ' +
            'spent as 2 M€ toward the cost of playing a Venus, Moon, or Jovian card.', /* parens */ true);
        }),
      },
    });
  }
}
