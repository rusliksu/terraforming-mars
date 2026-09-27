import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {Board} from '../../boards/Board';
import {BoardType} from '../../boards/BoardType';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class SynergisticForests extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SYNERGISTIC_FORESTS,
      tags: [Tag.PLANT],
      cost: 13,

      requirements: {party: PartyName.GREENS},

      metadata: {
        cardNumber: 'SL34',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you place a tile adjacent to one of your own Greenery tiles, gain 1 plant.', (eb) => {
            eb.greenery({withO2: false}).startEffect.plants(1);
          });
        }),
        description: 'Requires that Greens are ruling or that you have 2 delegates there. ' +
          'Effect: Whenever you place a tile adjacent to one of your own Greenery tiles, gain 1 plant.',
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space, boardType: BoardType): void {
    if (cardOwner.id !== activePlayer.id || boardType !== BoardType.MARS) {
      return;
    }
    const adjacentSpaces = cardOwner.game.board.getAdjacentSpaces(space);
    const hasOwnGreeneryAdjacent = adjacentSpaces.some(
      (adjacent) => Board.isGreenerySpace(adjacent) && Board.spaceOwnedBy(adjacent, cardOwner));
    if (hasOwnGreeneryAdjacent) {
      cardOwner.stock.add(Resource.PLANTS, 1, {log: true, from: {card: this}});
    }
  }
}
