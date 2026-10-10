import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {CardResource} from '@/common/CardResource';
import {Resource} from '@/common/Resource';
import {IPlayer} from '@/server/IPlayer';
import {ICard} from '@/server/cards/ICard';
import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {DrawCards} from '@/server/deferredActions/DrawCards';
import {AndOptions} from '@/server/inputs/AndOptions';
import {SelectAmount} from '@/server/inputs/SelectAmount';
import {InputError} from '@/server/inputs/InputError';
import {hasFloaterIcon} from '@/server/cards/venusNext/floaterCards';

export class StormCraftIncorporatedRebalanced extends CorporationCard {
  constructor() {
    super({
      name: CardName.STORMCRAFT_INCORPORATED_REBALANCED,
      tags: [Tag.JOVIAN],
      startingMegaCredits: 50,
      initialActionText: 'Draw a card with a floater icon',
      metadata: {
        cardNumber: 'R29',
        description: 'You start with 50 M€. As your first action, reveal cards from the deck until you have revealed 1 card with a floater icon on it. Take that card into hand and discard the rest.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(50).nbsp.cards(1).asterix();
          b.corpBox('effect', (ce) => {
            ce.effect('When you receive a floater on ANY card, gain 1 M€ or 1 energy.', (eb) => {
              eb.resource(CardResource.FLOATER).startEffect.megacredits(1).or().energy(1);
            });
          });
        }),
      },
    });
  }

  public override initialAction(player: IPlayer) {
    player.game.defer(DrawCards.keepAll(player, 1, {
      include: hasFloaterIcon,
    }));
    return undefined;
  }

  public onResourceAdded(player: IPlayer, card: ICard, count: number) {
    if (card.resourceType !== CardResource.FLOATER || count <= 0) {
      return;
    }
    let megacredits = 0;
    let energy = 0;
    player.defer(new AndOptions(
      new SelectAmount('Gain M€', 'Confirm', 0, count).andThen((amount) => {
        megacredits = amount;
        return undefined;
      }),
      new SelectAmount('Gain energy', 'Confirm', 0, count).andThen((amount) => {
        energy = amount;
        return undefined;
      }),
    ).setTitle('Gain 1 M€ or 1 energy for each received floater').andThen(() => {
      if (megacredits + energy !== count) {
        throw new InputError('Choose exactly one resource per received floater');
      }
      player.stock.add(Resource.MEGACREDITS, megacredits, {log: true, from: {card: this}});
      player.stock.add(Resource.ENERGY, energy, {log: true, from: {card: this}});
      return undefined;
    }));
  }
}
