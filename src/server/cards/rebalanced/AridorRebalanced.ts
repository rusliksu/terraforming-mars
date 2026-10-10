import {Aridor} from '@/server/cards/colonies/Aridor';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class AridorRebalanced extends Aridor {
  public override get name() {
    return CardName.ARIDOR_REBALANCED;
  }
  public override get startingMegaCredits() {
    return 45;
  }
  public override get metadata() {
    return {
      ...super.metadata,
      description: 'You start with 45 M€. As your first action, put an additional Colony Tile of your choice into play',
      renderData: CardRenderer.builder((b) => {
        b.megacredits(45).nbsp.colonyTile();
        b.corpBox('effect', (ce) => ce.effect('When you get a new type of tag in play [event cards do not count], increase your M€ production 1 step.', (eb) => {
          eb.diverseTag().startEffect.production((pb) => pb.megacredits(1));
        }));
      }),
    };
  }
}
