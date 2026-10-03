import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IStandardProjectCard} from '../IStandardProjectCard';
import {Resource} from '../../../common/Resource';

const VENUS_STANDARD_PROJECTS: ReadonlyArray<CardName> = [
  CardName.CLOUD_CITY_STANDARD_PROJECT,
  CardName.GAS_MINE_STANDARD_PROJECT,
  CardName.FLOATER_ARRAY_STANDARD_PROJECT,
];

export class ImprovedFloatingSystems extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.IMPROVED_FLOATING_SYSTEMS,
      cost: 7,
      requirements: {tag: Tag.SCIENCE},

      metadata: {
        cardNumber: 'V57',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you pay for a Venus standard project, you gain 3 M€.', (eb) => {
            eb.plate('Venus standard project').startEffect.megacredits(3);
          });
        }),
        description: 'Requires that you have a Science tag.',
      },
    });
  }

  public onStandardProject(player: IPlayer, projectType: IStandardProjectCard) {
    if (VENUS_STANDARD_PROJECTS.includes(projectType.name)) {
      player.stock.add(Resource.MEGACREDITS, 3, {log: true, from: {card: this}});
    }
  }
}
