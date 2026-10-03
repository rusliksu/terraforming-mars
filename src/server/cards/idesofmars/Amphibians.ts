import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {Board} from '../../boards/Board';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';
import {CardRenderer} from '../render/CardRenderer';

export class Amphibians extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.AMPHIBIANS_IOM,
      tags: [Tag.ANIMAL],
      cost: 7,

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}},
      requirements: {temperature: -12},

      metadata: {
        cardNumber: '141',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you place an Ocean tile, add an animal to this card.', (eb) => {
            eb.oceans(1).startEffect.resource(CardResource.ANIMAL);
          }).br;
          b.vpText('1 VP per animal on this card.');
        }),
        description: 'Requires -12 C or warmer.',
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (cardOwner.id === activePlayer.id && Board.isOceanSpace(space)) {
      cardOwner.game.defer(new AddResourcesToCard(cardOwner, CardResource.ANIMAL, {filter: (c) => c.name === this.name}));
    }
  }
}
