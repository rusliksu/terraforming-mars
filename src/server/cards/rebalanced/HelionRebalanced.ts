import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {Tag} from '@/common/cards/Tag';
import {IPlayer} from '@/server/IPlayer';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';

export class HelionRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.HELION_REBALANCED,
      tags: [Tag.SPACE],
      startingMegaCredits: 40,

      behavior: {
        production: {heat: 4},
      },

      metadata: {
        cardNumber: 'R18',
        description: 'You start with 4 heat production and 40 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br;
          b.production((pb) => pb.heat(4)).nbsp.megacredits(40);
          b.corpBox('effect', (ce) => {
            ce.effect('You may use heat as M€. You may not use M€ as heat.', (eb) => {
              eb.startEffect.text('x').heat(1).equals().megacredits(1, {text: 'x'});
            });
            ce.effect('You may always spend 7 heat, instead of 8, to raise temperature.', (eb) => {
              eb.heat(7).startAction.temperature(1);
            });
          });
        }),
      },
    });
  }
  public override bespokePlay(player: IPlayer) {
    player.canUseHeatAsMegaCredits = true;
    return undefined;
  }
  public getHeatConversionCost() {
    return 7;
  }
}
