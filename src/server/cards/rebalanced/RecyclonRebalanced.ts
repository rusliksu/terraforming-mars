import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {IPlayer} from '@/server/IPlayer';
import {Tag} from '@/common/cards/Tag';
import {Resource} from '@/common/Resource';
import {CardResource} from '@/common/CardResource';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {ICard} from '@/server/cards/ICard';
import {SelectOption} from '@/server/inputs/SelectOption';
import {OrOptions} from '@/server/inputs/OrOptions';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {digit} from '@/server/cards/Options';

export class RecyclonRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.RECYCLON_REBALANCED,
      tags: [Tag.MICROBE, Tag.BUILDING],
      startingMegaCredits: 40,
      resourceType: CardResource.MICROBE,

      behavior: {
        production: {steel: 2},
      },

      metadata: {
        cardNumber: 'R26',
        description: 'You start with 40 M€ and 2 steel production.',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.megacredits(40).nbsp.production((pb) => pb.steel(2));
          b.corpBox('effect', (ce) => {
            ce.effect('When you play a building tag, including this, gain 1 microbe to this card, or remove 2 microbes here and raise your plant production 1 step.', (eb) => {
              eb.tag(Tag.BUILDING).colon().resource(CardResource.MICROBE).or();
              eb.resource(CardResource.MICROBE, {amount: 2, digit}).startEffect.production((pb) => pb.plants(1));
            });
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if (card.tags.includes(Tag.BUILDING) === false) {
      return undefined;
    }
    if (this.resourceCount < 2) {
      player.addResourceTo(this);
      return undefined;
    }

    const addResource = new SelectOption('Add a microbe resource to this card', 'Add microbe').andThen(() => {
      player.addResourceTo(this);
      return undefined;
    });

    const spendResource = new SelectOption('Remove 2 microbes on this card and increase plant production 1 step', 'Remove microbes').andThen(() => {
      player.removeResourceFrom(this, 2);
      player.production.add(Resource.PLANTS, 1);
      return undefined;
    });
    return new OrOptions(spendResource, addResource);
  }
}
