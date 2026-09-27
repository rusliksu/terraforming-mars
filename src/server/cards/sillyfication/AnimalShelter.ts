import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';
import {all} from '../Options';

export class AnimalShelter extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.ANIMAL_SHELTER,
      tags: [Tag.ANIMAL],
      cost: 13,
      victoryPoints: 1,

      requirements: {cities: 4, all},

      metadata: {
        cardNumber: 'T22',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.ANIMAL).slash().city({amount: 2, all});
        }),
        description: 'Requires 4 city tiles ON MARS. Add 1 animal to a card of yours for every 2 cities on Mars.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const count = Math.floor(player.game.board.getCitiesOnMars().length / 2);
    if (count > 0) {
      player.game.defer(new AddResourcesToCard(player, CardResource.ANIMAL, {count}));
    }
    return undefined;
  }
}
