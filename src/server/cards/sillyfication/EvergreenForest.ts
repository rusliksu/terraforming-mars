import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {GREENERY_TILES} from '../../../common/TileType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {PartyName} from '../../../common/turmoil/PartyName';

export class EvergreenForest extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.EVERGREEN_FOREST,
      tags: [Tag.PLANT],
      cost: 24,
      resourceType: CardResource.SEED,

      requirements: {party: PartyName.GREENS},

      metadata: {
        cardNumber: 'X77',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you place a greenery tile, add 1 seed to this card.', (eb) => {
            eb.greenery().startEffect.resource(CardResource.SEED);
          }).br;
          b.effect('At production, convert each seed on this card into 1 card.', (eb) => {
            eb.resource(CardResource.SEED).startEffect.cards(1);
          });
        }),
        description: 'Requires that Greens are ruling or that you have 2 delegates there.',
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (cardOwner.id !== activePlayer.id) {
      return;
    }
    if (space.tile === undefined || !GREENERY_TILES.has(space.tile.tileType)) {
      return;
    }
    cardOwner.addResourceTo(this, {qty: 1, log: true});
  }

  public onProductionPhase(player: IPlayer) {
    const count = this.resourceCount;
    if (count > 0) {
      player.removeResourceFrom(this, count, {log: true});
      player.drawCard(count);
    }
  }
}
