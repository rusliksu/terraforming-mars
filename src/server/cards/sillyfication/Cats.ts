import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {CITY_TILES} from '../../../common/TileType';
import {CardName} from '../../../common/cards/CardName';
import {RemoveResourcesFromCard} from '../../deferredActions/RemoveResourcesFromCard';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class Cats extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.CATS,
      tags: [Tag.EARTH, Tag.ANIMAL],
      cost: 14,

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}, per: 2},

      metadata: {
        cardNumber: 'T12',
        renderData: CardRenderer.builder((b) => {
          b.effect('When any city tile is placed, steal an animal from a card belonging to whoever placed it and add it to this card. If they have no animal, add one here anyway.', (eb) => {
            eb.city({all}).startEffect.resource(CardResource.ANIMAL);
          }).br;
          b.resource(CardResource.ANIMAL);
        }),
        description: 'Add 1 animal to this card when played.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.addResourceTo(this, {qty: 1, log: true});
    return undefined;
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (space.tile === undefined || !CITY_TILES.has(space.tile.tileType)) {
      return;
    }
    const game = cardOwner.game;
    const isSelf = activePlayer === cardOwner;
    // Exclude this card itself: otherwise, once Cats already holds an animal and no other
    // card does, it would be the sole "target," stealing from itself and handing it right
    // back — a net-zero result instead of the guaranteed +1 the card text promises.
    const targets = RemoveResourcesFromCard.getAvailableTargetCards(activePlayer, CardResource.ANIMAL, 'self')
      .filter((card) => card !== this);
    if (targets.length === 0) {
      cardOwner.addResourceTo(this, {qty: 1, log: true});
      return;
    }
    game.defer(new RemoveResourcesFromCard(cardOwner, CardResource.ANIMAL, 1, {
      source: isSelf ? 'self' : 'opponents',
      restrictToPlayer: isSelf ? undefined : activePlayer,
      blockable: !isSelf,
      log: true,
    })).andThen((response) => {
      if (response.proceed) {
        cardOwner.addResourceTo(this, {qty: 1, log: true});
      }
      return undefined;
    });
  }
}
