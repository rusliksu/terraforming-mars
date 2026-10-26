import {IProjectCard} from '../IProjectCard';
import {ICard} from '../ICard';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {GainResourcesDeferred} from '../../deferredActions/GainResourcesDeferred';
import {SilverCard} from './SilverCard';

export class OrbitalShipyard extends SilverCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ORBITAL_SHIPYARD,
      tags: [Tag.SPACE],
      cost: 3,

      metadata: {
        cardNumber: 'HO08',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you play a card with an Infrastructure tag, including this one, gain 2 M€.', (eb) => {
            eb.tag(Tag.INFRASTRUCTURE).startEffect.megacredits(2);
          });
        }),
      },
    });
  }

  // player.tags.cardHasTag also fires for this card's own play, since onCardPlayed is
  // dispatched from Player.playCard after the card has already been pushed into playedCards.
  public onCardPlayed(player: IPlayer, card: ICard) {
    if (player.tags.cardHasTag(card, Tag.INFRASTRUCTURE)) {
      player.game.defer(new GainResourcesDeferred(player, Resource.MEGACREDITS, {count: 2, log: true}));
    }
  }
}
