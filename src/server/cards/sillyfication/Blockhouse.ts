import {IProjectCard} from '../IProjectCard';
import {IStandardProjectCard} from '../IStandardProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {IPlayer} from '../../IPlayer';

export class Blockhouse extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.BLOCKHOUSE,
      tags: [Tag.BUILDING],
      cost: 10,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'T34',
        renderData: CardRenderer.builder((b) => {
          b.effect('Each steel you have is worth 2 M€ extra when playing a City-tagged card, or when paying for the CITY STANDARD PROJECT. Steel may be used to pay for the City standard project.', (eb) => {
            eb.steel(1).nbsp.tag(Tag.CITY).startEffect.plus(Size.SMALL).megacredits(2);
          }).br;
          b.effect('Everyone pays 3 M€ more to play a City-tagged card, or to use the CITY STANDARD PROJECT.', (eb) => {
            eb.tag(Tag.CITY).startEffect.plus(Size.SMALL).megacredits(3);
          });
        }),
      },
    });
  }

  public getCardCostIncrease(_cardOwner: IPlayer, _activePlayer: IPlayer, card: IProjectCard): number {
    return card.tags.includes(Tag.CITY) ? 3 : 0;
  }

  public getStandardProjectCostIncrease(_cardOwner: IPlayer, _activePlayer: IPlayer, standardProject: IStandardProjectCard): number {
    return standardProject.name === CardName.CITY_STANDARD_PROJECT ? 3 : 0;
  }
}
