import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {Tag} from '../../../../common/cards/Tag';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

export class LifeExtension extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.LIFE_EXTENSION,
      description: 'Gain 2 M€ for each city tile you own and influence. Lose 1 M€ for each city tag you own.',
      revealedDelegate: PartyName.TRANSHUMANISTS,
      currentDelegate: PartyName.CENTRISTS,
      behavior: {
        stock: {
          // `all: false` restricts the city-tile count to this player's own cities -- Countable's
          // `cities` defaults to counting every city on the board (see Countable.ts), unlike `tag`.
          megacredits: {cities: {}, all: false, each: 2, turmoil: {influence: {}}},
        },
        lose: {
          stock: {
            megacredits: {tag: Tag.CITY},
          },
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.megacredits(2).slash().city().plus().influence({size: Size.SMALL}).nbsp.nbsp;
        b.minus().megacredits(1).slash().tag(Tag.CITY);
      }),
    });
  }
}
