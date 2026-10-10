import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {Tag} from '@/common/cards/Tag';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {ICard} from '@/server/cards/ICard';
import {IPlayer} from '@/server/IPlayer';
import {SimpleDeferredAction} from '@/server/deferredActions/DeferredAction';
import {OrOptions} from '@/server/inputs/OrOptions';
import {SelectOption} from '@/server/inputs/SelectOption';
import {Resource} from '@/common/Resource';

export class EcoLineRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.ECOLINE_REBALANCED,
      tags: [Tag.PLANT],
      startingMegaCredits: 37,

      behavior: {
        production: {plants: 3},
      },

      metadata: {
        cardNumber: 'R17',
        description: 'You start with 3 plant production and 37 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br;
          b.production((pb) => pb.plants(3)).nbsp.megacredits(37);
          b.corpBox('effect', (ce) => {
            ce.effect('Each time you play a plant, animal or microbe tag, including this, gain 2 M€ or 1 plant.', (eb) => {
              eb.tag(Tag.PLANT).slash().tag(Tag.ANIMAL).slash().tag(Tag.MICROBE).startEffect.megacredits(2).or().plants(1);
            });
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    const count = card.tags.filter((tag) => tag === Tag.PLANT || tag === Tag.ANIMAL || tag === Tag.MICROBE).length;
    for (let i = 0; i < count; i++) {
      if (player.plants < 0) {
        player.stock.add(Resource.PLANTS, 1);
      } else {
        player.game.defer(new SimpleDeferredAction(player, () => new OrOptions(
          new SelectOption('Gain 2 M€', 'Gain M€').andThen(() => {
            player.stock.add(Resource.MEGACREDITS, 2, {log: true, from: {card: this}});
            return undefined;
          }),
          new SelectOption('Gain 1 plant', 'Gain plant').andThen(() => {
            player.stock.add(Resource.PLANTS, 1, {log: true, from: {card: this}});
            return undefined;
          }),
        )));
      }
    }
  }
}
