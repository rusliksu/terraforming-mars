import {CardName} from '@/common/cards/CardName';
import {CardResource} from '@/common/CardResource';
import {IPlayer} from '@/server/IPlayer';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Pristar} from '@/server/cards/turmoil/Pristar';

export class PristarRebalanced extends Pristar {
  public override get name() {
    return CardName.PRISTAR_REBALANCED;
  }

  public override get metadata() {
    return {
      ...super.metadata,
      renderData: CardRenderer.builder((b) => {
        b.megacredits(53).nbsp.minus().tr(2);
        b.corpBox('effect', (ce) => {
          ce.effect('During production phase, if you did not get TR so far this generation, add one preservation resource here and gain 6 M€. You have 1 extra influence while you have not raised TR this generation.', (eb) => {
            eb.tr(1, {cancelled: true}).startEffect.resource(CardResource.PRESERVATION).megacredits(6).influence({amount: 1});
          });
        });
      }),
    };
  }

  public getInfluenceBonus(player: IPlayer): number {
    return player.hasIncreasedTerraformRatingThisGeneration ? 0 : 1;
  }
}
