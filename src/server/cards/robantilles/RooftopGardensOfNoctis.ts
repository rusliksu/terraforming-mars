import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import * as DynamicVictoryPoints from '../render/DynamicVictoryPoints';

export class RooftopGardensOfNoctis extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.ROOFTOP_GARDENS_OF_NOCTIS,
      tags: [Tag.MARS, Tag.PLANT],
      cost: 30,

      behavior: {
        production: {plants: 1},
      },

      victoryPoints: 'special',

      metadata: {
        cardNumber: 'H25',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(1)).br;
          b.vpText('1 VP for each city tile you own on Mars.');
        }),
        victoryPoints: DynamicVictoryPoints.cities(1, 1, false),
        description: 'Increase your plant production 1 step.',
      },
    });
  }

  // `victoryPoints: {cities: {}}` can't express "on Mars specifically" -- that variant
  // (Countable.cities.where) only exists on the general Countable type, not the reduced
  // CountableVictoryPoints used by the declarative `victoryPoints` property. Overriding
  // getVictoryPoints directly, as RedCity.ts does, sidesteps that.
  public override getVictoryPoints(player: IPlayer): number {
    return player.game.board.getCitiesOnMars(player).length;
  }
}
