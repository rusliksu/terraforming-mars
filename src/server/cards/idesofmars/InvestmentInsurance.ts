import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class InvestmentInsurance extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.INVESTMENT_INSURANCE,
      tags: [Tag.EARTH],
      cost: 5,

      behavior: {
        production: {megacredits: -1},
      },

      metadata: {
        cardNumber: 'Im121',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().megacredits(1)).br;
          b.effect('During production phase, increase your M€ production 1 step if you did not increase it during the previous generation.', (eb) => {
            eb.empty().startEffect.production((pb) => pb.megacredits(1));
          });
        }),
        description: 'Decrease your M€ production 1 step.',
      },
    });
  }

  // Tracks this player's M€ production as of the last time this card checked, so the
  // production-phase effect can tell whether it went up since then (i.e. during the
  // generation that just ended).
  public data: {previousMegacreditProduction: number} = {previousMegacreditProduction: 0};

  public override bespokePlay(player: IPlayer) {
    // Behavior (the -1 M€ production) has already resolved by the time bespokePlay runs.
    this.data.previousMegacreditProduction = player.production.megacredits;
    return undefined;
  }

  public onProductionPhase(player: IPlayer) {
    if (player.production.megacredits > this.data.previousMegacreditProduction) {
      // Production went up since last time: that counts as "increased this generation".
      this.data.previousMegacreditProduction = player.production.megacredits;
      return;
    }
    player.production.add(Resource.MEGACREDITS, 1, {log: true, from: {card: this}});
    this.data.previousMegacreditProduction = player.production.megacredits;
  }
}
