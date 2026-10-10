import {MonsInsurance} from '@/server/cards/promo/MonsInsurance';
import {IPlayer} from '@/server/IPlayer';
import {Resource} from '@/common/Resource';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all, uppercase} from '@/server/cards/Options';
import {Size} from '@/common/cards/render/Size';

export class MonsInsuranceRebalanced extends MonsInsurance {
  public readonly isAttackCard = true;
  protected override insurancePayout = 2;
  public override get name() {
    return CardName.MONS_INSURANCE_REBALANCED;
  }
  public override get behavior() {
    return undefined;
  }
  public override get metadata() {
    return {
      cardNumber: 'R46',
      description: 'You start with 48 M€. Increase your M€ production 2 steps per opponent. ALL OPPONENTS DECREASE THEIR M€ production 2 STEPS. THIS DOES NOT TRIGGER THE EFFECT BELOW.',
      renderData: CardRenderer.builder((b) => {
        b.megacredits(48).production((pb) => pb.megacredits(2).asterix().nbsp.megacredits(-2, {all}).asterix());
        b.corpBox('effect', (ce) => ce.effect('When a player causes another player to decrease production or lose resources, pay 2 M€ to the victim, or as much as possible.', (eb) => {
          eb.production((pb) => pb.wild(1, {all})).or().minus().wild(1, {all});
          eb.startEffect.text('pay', {size: Size.SMALL, uppercase}).megacredits(2);
        }));
      }),
    };
  }
  public override bespokePlay(player: IPlayer) {
    const opponents = player.game.isSoloMode() ? 1 : player.opponents.length;
    player.production.add(Resource.MEGACREDITS, 2 * opponents, {log: true});
    return super.bespokePlay(player);
  }
}
