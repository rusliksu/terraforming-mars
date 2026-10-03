import {IPlayer} from '../../IPlayer';
import {CorporationCard} from '../corporation/CorporationCard';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {ICard} from '../ICard';
import {PlayerInput} from '../../PlayerInput';
import {Priority} from '../../deferredActions/Priority';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {digit} from '../Options';
import {SerializedCard} from '../../SerializedCard';

/**
 * A Pharmacy-Union-style flip corporation, gated to games with Pathfinders (the data resource
 * is a Pathfinders concept). Stores data on itself (a plain `resourceType`/`resourceCount`
 * card, unlike Signal Union which distributes to other cards). Front side rewards playing
 * EXPENSIVE cards: whenever a played card's base cost exceeds the data stored here, it banks
 * the difference and flips to its back side. Back side rewards playing CHEAP cards: whenever a
 * played card's base cost is less than the data stored here, it cashes in that many data for a
 * flat 5 M€. The card always flips back to its front side at the end of the generation.
 */
export class CostIndex extends CorporationCard implements ICorporationCard {
  private flipped = false;

  constructor() {
    super({
      name: CardName.COST_INDEX,
      startingMegaCredits: 36,
      resourceType: CardResource.DATA,

      behavior: {
        stock: {steel: 4, titanium: 4},
      },

      metadata: {
        cardNumber: 'X01', // Renumber
        description: 'You start with 36 M€, 4 steel, and 4 titanium.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(36).nbsp.steel(4, {digit}).nbsp.titanium(4, {digit}).br;
          b.corpBox('effect', (ce) => {
            ce.vSpace(Size.LARGE);
            ce.br;
            ce.effect('EXPENSIVE SIDE. Whenever you play a card whose base cost is more than the data here, add data equal to the difference, then flip this card.', (eb) => {
              eb.text('COST >', {size: Size.SMALL}).resource(CardResource.DATA).startEffect.resource(CardResource.DATA);
            });
            ce.br;
            ce.vSpace();
            ce.br;
            ce.effect('CHEAP SIDE. Whenever you play a card whose base cost is less than the data here, remove that much data and gain 5 M€. At generation end, flip this card back.', (eb) => {
              eb.text('COST <', {size: Size.SMALL}).resource(CardResource.DATA).startEffect.minus().resource(CardResource.DATA).megacredits(5);
            });
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): PlayerInput | undefined {
    const cost = card.cost;
    if (cost === undefined) {
      return undefined;
    }
    const stored = this.resourceCount;

    if (!this.flipped && cost > stored) {
      const gain = cost - stored;
      player.defer(() => {
        player.addResourceTo(this, {qty: gain, log: true});
        this.flipped = true;
        player.game.log('${0} flipped ${1} to its cheap side', (b) => b.player(player).card(this));
        return undefined;
      }, Priority.DEFAULT);
    } else if (this.flipped && cost > 0 && cost < stored) {
      player.defer(() => {
        player.removeResourceFrom(this, cost, {log: true});
        player.stock.add(Resource.MEGACREDITS, 5, {log: true, from: {card: this}});
        return undefined;
      }, Priority.DEFAULT);
    }
    return undefined;
  }

  public onProductionPhase(player: IPlayer): void {
    if (this.flipped) {
      this.flipped = false;
      player.game.log('${0} flipped ${1} back to its expensive side', (b) => b.player(player).card(this));
    }
  }

  public serialize(serialized: SerializedCard): void {
    serialized.data = {flipped: this.flipped};
  }

  public deserialize(serialized: SerializedCard): void {
    const data = serialized.data as {flipped?: boolean} | undefined;
    this.flipped = data?.flipped ?? false;
  }
}
