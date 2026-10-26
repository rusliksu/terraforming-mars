import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class NecroticBloom extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.NECROTIC_BLOOM,
      tags: [Tag.MICROBE],
      cost: 8,

      resourceType: CardResource.MICROBE,
      victoryPoints: {resourcesHere: {}, per: 3},

      action: {
        spend: {resourcesHere: 3},
        production: {plants: 1},
      },

      metadata: {
        cardNumber: 'X51',
        renderData: CardRenderer.builder((b) => {
          b.effect('When any player plays a plant or microbe tag, including yourself and this, add 1 microbe to this card.', (eb) => {
            eb.tag(Tag.PLANT, {all}).slash().tag(Tag.MICROBE, {all}).startEffect.resource(CardResource.MICROBE);
          }).br;
          b.action('Remove 3 microbes here to increase your plant production 1 step.', (eb) => {
            eb.resource(CardResource.MICROBE, {amount: 3}).startAction.production((pb) => pb.plants(1));
          }).br;
          b.vpText('1 VP per 3 microbes on this card.');
        }),
      },
    });
  }

  public onCardPlayedByAnyPlayer(cardOwner: IPlayer, card: ICard, activePlayer: IPlayer) {
    if (activePlayer.tags.cardHasTag(card, Tag.PLANT) || activePlayer.tags.cardHasTag(card, Tag.MICROBE)) {
      cardOwner.addResourceTo(this, {qty: 1, log: true});
    }
  }
}
