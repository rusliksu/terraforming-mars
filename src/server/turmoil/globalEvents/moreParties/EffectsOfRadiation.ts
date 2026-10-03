import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {Turmoil} from '../../Turmoil';
import {Resource} from '../../../../common/Resource';
import {Tag} from '../../../../common/cards/Tag';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

export class EffectsOfRadiation extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.EFFECTS_OF_RADIATION,
      description: 'Lose 4 energy resources, reduced by influence. Gain 2 M€ for each energy tag.',
      revealedDelegate: PartyName.SPOME,
      currentDelegate: PartyName.TRANSHUMANISTS,
      behavior: {
        stock: {
          megacredits: {
            tag: Tag.POWER,
            each: 2,
          },
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.minus().energy(4).slash().influence({size: Size.SMALL}).nbsp.megacredits(2).slash().tag(Tag.POWER);
      }),
    });
  }

  // The fixed "lose 4, reduced by influence" amount has no constant/base field in the Countable
  // DSL to subtract influence from (Countable can only cap or offset a counted sum built from
  // tags/cities/etc, not start from a flat number), so this half is computed directly.
  public override bespokeResolvePlayer(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const amount = Math.max(0, 4 - turmoil.getInfluence(player));
    if (amount > 0) {
      player.stock.deduct(Resource.ENERGY, amount, {log: true, from: {globalEvent: this}});
    }
  }
}
