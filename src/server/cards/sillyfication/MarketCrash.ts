import {Tag} from '../../../common/cards/Tag';
import {PreludeCard} from '../prelude/PreludeCard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all, digit} from '../Options';

export class MarketCrash extends PreludeCard {
  constructor() {
    super({
      name: CardName.MARKET_CRASH,
      tags: [Tag.CRIME, Tag.CRIME],

      behavior: {
        stock: {megacredits: 8},
      },

      metadata: {
        cardNumber: 'T19',
        renderData: CardRenderer.builder((b) => {
          b.minus().tr(2, {all}).br;
          b.minus().production((pb) => pb.megacredits(3, {all})).nbsp.megacredits(8, {digit});
        }),
        description: 'Every player, including you, loses 2 TR and decreases their M€ production 3 steps. Gain 8 M€.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    for (const p of player.game.players) {
      p.decreaseTerraformRating(2, {log: true});
      p.production.add(Resource.MEGACREDITS, -3, {log: true});
    }
    return undefined;
  }
}
