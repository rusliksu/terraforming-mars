import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {OCEAN_TILES} from '../../../common/TileType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class Amphibians extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.AMPHIBIANS,
      tags: [Tag.ANIMAL],
      cost: 12,

      requirements: {temperature: -12},

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}},

      metadata: {
        cardNumber: 'T05',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you place an ocean tile, add an animal to this card.', (eb) => {
            eb.oceans(1).startEffect.resource(CardResource.ANIMAL);
          }).br;
          b.vpText('1 VP per animal on this card.');
        }),
        description: 'Requires -12 C or warmer.',
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (cardOwner.id === activePlayer.id && space.tile !== undefined && OCEAN_TILES.has(space.tile.tileType)) {
      cardOwner.addResourceTo(this, {qty: 1, log: true});
    }
  }
}
