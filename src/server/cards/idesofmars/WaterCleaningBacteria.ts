import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {Board} from '../../boards/Board';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class WaterCleaningBacteria extends ActionCard implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.WATER_CLEANING_BACTERIA,
      tags: [Tag.POWER, Tag.MICROBE],
      cost: 14,
      resourceType: CardResource.MICROBE,

      requirements: {temperature: -18},

      behavior: {
        production: {energy: 1},
      },

      action: {
        spend: {resourcesHere: 8},
        ocean: {},
      },

      metadata: {
        cardNumber: 'I52',
        renderData: CardRenderer.builder((b) => {
          b.effect('When any ocean tile is placed, add 3 microbes to this card.', (eb) => {
            eb.oceans(1, {all}).startEffect.resource(CardResource.MICROBE, 3);
          });
          b.br;
          b.action('Remove 8 microbes here to place an ocean tile.', (eb) => {
            eb.resource(CardResource.MICROBE, {amount: 8, digit: true}).startAction.oceans(1);
          });
          b.br;
          b.production((pb) => pb.energy(1));
        }),
        description: 'Requires -18 C or warmer. Increase your energy production 1 step.',
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, _activePlayer: IPlayer, space: Space) {
    if (Board.isUncoveredOceanSpace(space)) {
      cardOwner.addResourceTo(this, {qty: 3, log: true});
    }
  }
}
