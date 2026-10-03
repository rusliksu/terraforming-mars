import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class PharmacyOnLuna extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PHARMACY_ON_LUNA,
      tags: [Tag.MOON, Tag.MICROBE],
      cost: 14,

      metadata: {
        cardNumber: 'X47',
        renderData: CardRenderer.builder((b) => {
          b.effect('When any player plays a microbe tag, including this, you gain 2 M€.', (eb) => {
            eb.tag(Tag.MICROBE, {all}).startEffect.megacredits(2);
          }).br;
          b.effect('When you play a microbe tag, including this, you may spend 2 M€ to draw a card.', (eb) => {
            eb.tag(Tag.MICROBE).startEffect.megacredits(-2).cards(1);
          });
        }),
      },
    });
  }

  public onCardPlayedByAnyPlayer(cardOwner: IPlayer, card: ICard, activePlayer: IPlayer) {
    const microbeTags = activePlayer.tags.cardTagCount(card, Tag.MICROBE);
    if (microbeTags > 0) {
      cardOwner.stock.add(Resource.MEGACREDITS, 2 * microbeTags, {log: true});
    }
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if (!player.tags.cardHasTag(card, Tag.MICROBE) || player.megaCredits < 2) {
      return undefined;
    }
    return new OrOptions(
      new SelectOption('Spend 2 M€ to draw a card', 'Spend').andThen(() => {
        player.stock.deduct(Resource.MEGACREDITS, 2);
        player.drawCard();
        return undefined;
      }),
      new SelectOption('Do nothing', 'Do nothing'),
    );
  }
}
