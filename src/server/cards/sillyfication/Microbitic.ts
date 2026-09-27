import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class Microbitic extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MICROBITIC,
      tags: [Tag.MICROBE, Tag.SCIENCE],
      cost: 12,

      // The plant cost is spent in bespokePlay, not here - see bespokeCanPlay for why
      // (Manutech/Viral Enhancers can cover it).
      behavior: {
        production: {plants: 2},
      },

      metadata: {
        cardNumber: 'T32',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(2)).br;
          b.minus().plants(2);
        }),
        description: 'Lose 2 plants. Increase your plant production 2 steps.',
      },
    });
  }

  // Same "spend N, produce N plants" shape as Nitrophilic Moss - see that card for why
  // Manutech (grants the produced plants immediately) or Viral Enhancers (grants 1 plant
  // for this card's single Microbe tag) let you play with fewer plants than the sticker cost.
  public override bespokeCanPlay(player: IPlayer): boolean {
    const viralEnhancers = player.tableau.get(CardName.VIRAL_ENHANCERS);
    const hasEnoughPlants = player.plants >= 2 || player.tableau.has(CardName.MANUTECH) ||
      (player.plants >= 1 && viralEnhancers !== undefined);

    return hasEnoughPlants;
  }
  public override bespokePlay(player: IPlayer) {
    player.plants -= 2;
    return undefined;
  }
}
