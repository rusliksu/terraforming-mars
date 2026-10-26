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
import {Size} from '../../../common/cards/render/Size';

export class OrbitalHeadquarters extends SilverCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ORBITAL_HEADQUARTERS,
      tags: [Tag.WILD],
      cost: 2,

      behavior: {
        stock: {megacredits: 10},
      },

      metadata: {
        cardNumber: 'HO02',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(10).br;
          b.text(
            'EFFECT: Whenever you play a card with a tag matching one of your corporation\'s tags, gain 1 M€.',
            {size: Size.SMALL});
        }),
        description: 'Gain 10 M€.',
      },
    });
  }

  // A player can only ever own one copy of this card (SilverCard blocks a second copy),
  // so this behaves as a one-time "gain 10 M€" without needing extra bookkeeping.
  public onCardPlayed(player: IPlayer, card: ICard) {
    const corporationTags = player.pickedCorporationCard?.tags ?? [];
    if (corporationTags.length === 0) {
      return;
    }
    const matches = card.tags.some((tag) => corporationTags.includes(tag));
    if (matches) {
      player.game.defer(new GainResourcesDeferred(player, Resource.MEGACREDITS, {count: 1, log: true}));
    }
  }
}
