import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {ICard} from '../ICard';
import {GainProduction} from '../../deferredActions/GainProduction';
import {CardRenderer} from '../render/CardRenderer';
import {Units} from '../../../common/Units';

export class GreatOceanLaboratory extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.GREAT_OCEAN_LABORATORY,
      tags: [Tag.MICROBE, Tag.BUILDING],
      cost: 20,

      requirements: {oceans: 5},
      victoryPoints: {tag: Tag.MICROBE},

      metadata: {
        cardNumber: 'B16',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you play a microbe tag, including this, increase your M€ production 1 step.', (eb) => {
            eb.tag(Tag.MICROBE).startEffect.production((pb) => pb.megacredits(1));
          });
          b.br;
          b.vpText('1 VP for each microbe tag you have.');
        }),
        description: 'Requires 5 oceans in play.',
      },
    });
  }

  // Fires for every card play, including this card's own play, because the framework adds a
  // card to the player's tableau before dispatching onCardPlayed for it.
  public onCardPlayed(player: IPlayer, card: ICard): void {
    const amount = player.tags.cardTagCount(card, Tag.MICROBE);
    if (amount > 0) {
      player.game.defer(new GainProduction(player, Resource.MEGACREDITS, {count: amount}));
    }
  }

  // Exposes this card's own contribution (its Microbe tag) so Robotic Workforce can replay it.
  public productionBox(player: IPlayer): Units {
    return Units.of({megacredits: player.tags.cardTagCount(this, Tag.MICROBE)});
  }
}
