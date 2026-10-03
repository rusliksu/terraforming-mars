import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class DerivedProducts extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.DERIVED_PRODUCTS,
      tags: [Tag.EARTH],
      cost: 4,

      behavior: {
        production: {megacredits: 2},
      },

      metadata: {
        cardNumber: '146',
        renderData: CardRenderer.builder((b) => {
          b.text('Requires 3 VP on your played cards.', {size: Size.SMALL}).br;
          b.production((pb) => pb.megacredits(2));
        }),
        description: 'Increase your M€ production 2 steps.',
      },
    });
  }

  // No RequirementType covers "VP already on your played cards" -- this engine's
  // requirements DSL has no such descriptor, so this is a bespoke canPlay check instead of
  // a declarative `requirements` entry (see report).
  private cardVictoryPoints(player: IPlayer): number {
    let total = 0;
    for (const playedCard of player.tableau) {
      if (playedCard.victoryPoints !== undefined) {
        total += playedCard.getVictoryPoints(player);
      }
    }
    return total;
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.cardVictoryPoints(player) >= 3;
  }
}
